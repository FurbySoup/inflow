import { CameraTile } from 'storm-chasers'

// Illustrative highway-camera frames (inline SVG) so the card doesn't depend on live DOT snapshot URLs.
const frame = (sky: string, label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">` +
      `<rect width="320" height="120" fill="${sky}"/>` +
      `<rect y="120" width="320" height="120" fill="#3b4148"/>` +
      `<polygon points="120,120 200,120 320,240 0,240" fill="#2a2f35"/>` +
      `<line x1="160" y1="122" x2="160" y2="240" stroke="#d8c060" stroke-width="3" stroke-dasharray="14 12"/>` +
      `<rect x="96" y="150" width="34" height="18" rx="3" fill="#c9ced4"/><rect x="186" y="176" width="40" height="22" rx="3" fill="#8a1f1f"/>` +
      `<text x="8" y="16" font-family="monospace" font-size="11" fill="#fff">${label}</text>` +
    `</svg>`,
  )

/** Grid as the cameras panel shows it, including a frame still loading. */
export const Grid = () => (
  <div style={{ width: 340, padding: 10, background: 'var(--panel)' }}>
    <div className="cam-grid">
      <CameraTile title="US-54 at Sycamore" src={frame('#6f7f8e', 'KDOT 19:09')} onOpen={() => {}} />
      <CameraTile title="LP-1 @ Bowman Ave" src={frame('#4a5560', 'TXDOT 19:09')} onOpen={() => {}} />
      <CameraTile title="I-135 at 21st St N" src={frame('#2e3842', 'KDOT 19:08')} onOpen={() => {}} />
      <CameraTile title="IH-35 @ Manor Upper" src={null} onOpen={() => {}} />
    </div>
  </div>
)

/** Single tile, storm-darkened sky. */
export const Single = () => (
  <div style={{ width: 180, padding: 10, background: 'var(--panel)' }}>
    <CameraTile title="I-16 at SR 67 (Statesboro)" src={frame('#25303a', 'GDOT 19:10')} onOpen={() => {}} />
  </div>
)
