// Opens the default browser after the server is listening (WP-49). Fire-and-forget: a failure only logs a hint.
import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { existsSync } from 'node:fs'

export type SpawnFn = (cmd: string, args: string[], opts: SpawnOptions) => ChildProcess

export interface OpenDeps {
  platform?: NodeJS.Platform
  spawn?: SpawnFn
  /** Inside Docker there is no desktop to open, so the check skips the browser. */
  hasDockerEnv?: () => boolean
  log?: (line: string) => void
}

/** Opens the browser for `--open` or OPEN_BROWSER=1. */
export function wantsBrowser(argv: readonly string[], env: NodeJS.ProcessEnv): boolean {
  return argv.includes('--open') || env.OPEN_BROWSER === '1'
}

/** 0.0.0.0 and :: listen on every interface, so the browser still goes to localhost. */
export function browserUrl(host: string, port: number): string {
  if (host === '0.0.0.0' || host === '::') return `http://localhost:${port}/`
  const shown = host.includes(':') ? `[${host}]` : host
  return `http://${shown}:${port}/`
}

export interface BrowserCommand {
  cmd: string
  args: string[]
  verbatim: boolean
}

export function browserCommand(platform: NodeJS.Platform, url: string): BrowserCommand {
  if (platform === 'win32') {
    // `start ""` takes an empty window title; the quotes must reach cmd unescaped, hence verbatim.
    return { cmd: 'cmd', args: ['/c', 'start', '""', url], verbatim: true }
  }
  if (platform === 'darwin') return { cmd: 'open', args: [url], verbatim: false }
  return { cmd: 'xdg-open', args: [url], verbatim: false }
}

export function openBrowser(url: string, deps: OpenDeps = {}): void {
  const {
    platform = process.platform,
    spawn = nodeSpawn,
    hasDockerEnv = () => existsSync('/.dockerenv'),
    log = console.log,
  } = deps
  if (hasDockerEnv()) return

  const { cmd, args, verbatim } = browserCommand(platform, url)
  const hint = () => log(`Open ${url} in your browser.`)
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: verbatim })
    child.on('error', hint)
    child.unref()
  } catch {
    hint()
  }
}
