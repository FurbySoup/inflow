// @vitest-environment node
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { browserCommand, browserUrl, openBrowser, wantsBrowser, type SpawnFn } from './openBrowser'

function fakeChild(): ChildProcess & EventEmitter {
  const child = new EventEmitter() as ChildProcess & EventEmitter
  child.unref = vi.fn()
  return child
}

describe('browserUrl', () => {
  it('keeps 127.0.0.1 when that is the host', () => {
    expect(browserUrl('127.0.0.1', 8080)).toBe('http://127.0.0.1:8080/')
  })

  it('opens localhost when listening on every interface', () => {
    expect(browserUrl('0.0.0.0', 8081)).toBe('http://localhost:8081/')
    expect(browserUrl('::', 8081)).toBe('http://localhost:8081/')
  })

  it('brackets an IPv6 host', () => {
    expect(browserUrl('fe80::1', 8080)).toBe('http://[fe80::1]:8080/')
  })
})

describe('browserCommand', () => {
  const url = 'http://localhost:8080/'

  it('uses cmd start with an empty title on Windows, verbatim so the quotes survive', () => {
    expect(browserCommand('win32', url)).toEqual({ cmd: 'cmd', args: ['/c', 'start', '""', url], verbatim: true })
  })

  it('uses open on macOS', () => {
    expect(browserCommand('darwin', url)).toEqual({ cmd: 'open', args: [url], verbatim: false })
  })

  it('uses xdg-open everywhere else', () => {
    expect(browserCommand('linux', url)).toEqual({ cmd: 'xdg-open', args: [url], verbatim: false })
  })
})

describe('openBrowser', () => {
  const url = 'http://localhost:8080/'

  it('spawns detached with ignored stdio, then unrefs the child', () => {
    const child = fakeChild()
    const spawn = vi.fn<SpawnFn>(() => child)
    openBrowser(url, { platform: 'darwin', spawn, hasDockerEnv: () => false, log: vi.fn() })
    expect(spawn).toHaveBeenCalledWith('open', [url], {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: false,
    })
    expect(child.unref).toHaveBeenCalled()
  })

  it('passes the Windows command through verbatim', () => {
    const spawn = vi.fn<SpawnFn>(() => fakeChild())
    openBrowser(url, { platform: 'win32', spawn, hasDockerEnv: () => false, log: vi.fn() })
    expect(spawn).toHaveBeenCalledWith('cmd', ['/c', 'start', '""', url], expect.objectContaining({ windowsVerbatimArguments: true }))
  })

  it('treats a spawn error as non-fatal and prints the hint', () => {
    const child = fakeChild()
    const log = vi.fn()
    openBrowser(url, { platform: 'linux', spawn: () => child, hasDockerEnv: () => false, log })
    expect(() => child.emit('error', new Error('ENOENT'))).not.toThrow()
    expect(log).toHaveBeenCalledWith(`Open ${url} in your browser.`)
  })

  it('treats a synchronous spawn throw as non-fatal too', () => {
    const log = vi.fn()
    const spawn = (): ChildProcess => {
      throw new Error('boom')
    }
    expect(() => openBrowser(url, { platform: 'linux', spawn, hasDockerEnv: () => false, log })).not.toThrow()
    expect(log).toHaveBeenCalledWith(`Open ${url} in your browser.`)
  })

  it('does nothing inside Docker', () => {
    const spawn = vi.fn<SpawnFn>(() => fakeChild())
    openBrowser(url, { platform: 'linux', spawn, hasDockerEnv: () => true, log: vi.fn() })
    expect(spawn).not.toHaveBeenCalled()
  })
})

describe('wantsBrowser', () => {
  it('is on for --open or OPEN_BROWSER=1', () => {
    expect(wantsBrowser(['node', 'index.js', '--open'], {})).toBe(true)
    expect(wantsBrowser(['node', 'index.js'], { OPEN_BROWSER: '1' })).toBe(true)
  })

  it('is off otherwise, including OPEN_BROWSER=0', () => {
    expect(wantsBrowser(['node', 'index.js'], {})).toBe(false)
    expect(wantsBrowser(['node', 'index.js'], { OPEN_BROWSER: '0' })).toBe(false)
  })
})
