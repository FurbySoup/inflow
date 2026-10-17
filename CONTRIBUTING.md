# Contributing

Thanks for looking. This project is maintained best-effort.

- Run the gate before you open a PR: `npm run typecheck && npm run lint && npm test && npm run build:ui`.
- Keep each PR to one data source.
- A new source needs an adapter, a trimmed real-response fixture and a `normalize` test.
- Never guess stream or channel IDs. Confirm them on the channel's own page first.
- Proxy routes live in `proxy/routes.ts`. Add one only when a source needs CORS or a User-Agent.
