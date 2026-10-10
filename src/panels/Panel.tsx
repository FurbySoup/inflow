import { Panel as UiPanel, type PanelProps as UiPanelProps } from '../ui'
import { useLayout } from '../state/layout'

type PanelProps = Omit<UiPanelProps, 'collapsed' | 'onToggleCollapse'>

/** UI-kit Panel wired to the layout store: collapse state is keyed by `code` (ADR-0011). */
export function Panel(props: PanelProps) {
  const collapsed = useLayout((s) => s.hidden.includes(props.code))
  const toggleHidden = useLayout((s) => s.toggleHidden)
  return <UiPanel {...props} collapsed={collapsed} onToggleCollapse={() => toggleHidden(props.code)} />
}
