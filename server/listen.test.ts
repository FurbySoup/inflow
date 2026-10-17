// @vitest-environment node
// Real http servers on ephemeral ports. exit/log/error are injected so a fatal path can't kill vitest.
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listenWithFallback } from './listen'

const HOST = '127.0.0.1'
const servers: Server[] = []

function track(): Server {
  const server = createServer()
  servers.push(server)
  return server
}

function listenOn(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, () => resolve((server.address() as AddressInfo).port))
  })
}

/** A port that is busy for as long as the returned server stays open. */
async function occupy(): Promise<number> {
  return listenOn(track(), 0)
}

/** A port the OS just handed out and then released, so it is almost certainly free. */
async function freePort(): Promise<number> {
  const probe = track()
  const port = await listenOn(probe, 0)
  await new Promise<void>((resolve) => probe.close(() => resolve()))
  return port
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => (s.listening ? new Promise<void>((resolve) => s.close(() => resolve())) : undefined)),
  )
})

describe('listenWithFallback', () => {
  it('binds the requested port when it is free, without logging', async () => {
    const port = await freePort()
    const log = vi.fn()
    const bound = await listenWithFallback(track(), { port, host: HOST, explicitPort: false, log })
    expect(bound).toBe(port)
    expect(log).not.toHaveBeenCalled()
  })

  it('falls back to the next free port when PORT was not set', async () => {
    const busy = await occupy()
    const log = vi.fn()
    const bound = await listenWithFallback(track(), { port: busy, host: HOST, explicitPort: false, log })
    expect(bound).toBe(busy + 1)
    expect(log).toHaveBeenCalledWith(`INFLOW: port ${busy} is busy, using ${busy + 1} instead.`)
  })

  it('never falls back when PORT is explicit: prints the error and exits 1', async () => {
    const busy = await occupy()
    const error = vi.fn()
    const exit = vi.fn()
    await expect(
      listenWithFallback(track(), { port: busy, host: HOST, explicitPort: true, error, exit }),
    ).rejects.toThrow(/Set PORT to a free port, e\.g\. PORT=8090\./)
    expect(error).toHaveBeenNthCalledWith(1, `INFLOW: could not listen on ${HOST}:${busy} (EADDRINUSE)`)
    expect(error).toHaveBeenNthCalledWith(2, 'Set PORT to a free port, e.g. PORT=8090.')
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('gives up with one clear message when every candidate is busy', async () => {
    const busy = await occupy()
    const error = vi.fn()
    const exit = vi.fn()
    await expect(
      listenWithFallback(track(), { port: busy, host: HOST, explicitPort: false, tries: 1, error, exit }),
    ).rejects.toThrow(`no free port from ${busy} to ${busy}`)
    expect(exit).toHaveBeenCalledWith(1)
  })
})
