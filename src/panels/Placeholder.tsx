import { Panel } from './Panel'

// Stand-in for panels owned by an open work package (see docs/packages/). Replace, don't extend.
export function Placeholder({ title, code, pkg }: { title: string; code: string; pkg: string }) {
  return (
    <Panel code={code} title={title} status="offline">
      <p className="muted">AWAITING {pkg}</p>
    </Panel>
  )
}
