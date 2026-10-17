// Port selection for the production server (WP-49). When PORT is not set, a busy port moves up to the next
// free one. An explicit PORT never falls back. log/error/exit are injectable so tests don't kill vitest.
import type { Server } from 'node:http'

export interface ListenOptions {
  port: number
  host: string
  /** True when PORT was set in the environment. An explicit port never falls back. */
  explicitPort: boolean
  tries?: number
  log?: (line: string) => void
  error?: (line: string) => void
  exit?: (code: number) => void
}

/** Resolves with the bound port. On a fatal error it prints the message, calls exit(1) and rejects. */
export async function listenWithFallback(server: Server, opts: ListenOptions): Promise<number> {
  const {
    port,
    host,
    explicitPort,
    tries = 10,
    log = console.log,
    error = console.error,
    exit = process.exit,
  } = opts

  const fail = (lines: string[]): never => {
    for (const line of lines) error(line)
    exit(1)
    throw new Error(lines.join('\n'))
  }

  const last = explicitPort ? port : Math.min(port + tries - 1, 65535)
  for (let candidate = port; candidate <= last; candidate++) {
    try {
      await listenOnce(server, candidate, host)
      return boundPort(server, candidate)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? 'UNKNOWN'
      if (code === 'EADDRINUSE') {
        if (explicitPort) {
          return fail([
            `INFLOW: could not listen on ${host}:${candidate} (EADDRINUSE)`,
            'Set PORT to a free port, e.g. PORT=8090.',
          ])
        }
        if (candidate < last) {
          log(`INFLOW: port ${candidate} is busy, using ${candidate + 1} instead.`)
          continue
        }
        return fail([`INFLOW: no free port from ${port} to ${last}. Set PORT to a free port, e.g. PORT=8090.`])
      }
      if (code === 'EACCES') {
        return fail([`INFLOW: permission denied for port ${candidate} (EACCES). Set PORT to a free port, e.g. PORT=8090.`])
      }
      return fail([`INFLOW: could not listen on ${host}:${candidate} (${code})`])
    }
  }
  return fail([`INFLOW: no free port from ${port} to ${last}. Set PORT to a free port, e.g. PORT=8090.`])
}

function listenOnce(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      server.removeListener('listening', onListening)
      reject(err)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

function boundPort(server: Server, fallback: number): number {
  const address = server.address()
  return typeof address === 'object' && address !== null ? address.port : fallback
}
