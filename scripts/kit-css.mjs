// Writes dist/ui/kit.css = tokens.css + styles.css, the single stylesheet the Claude Design sync ships
// (cfg.cssEntry). The app imports both files separately from src/index.css; the converter doesn't
// follow relative @imports, so the kit stylesheet is concatenated here instead.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const tokens = readFileSync('src/ui/tokens.css', 'utf8')
const styles = readFileSync('src/ui/styles.css', 'utf8')
mkdirSync('dist/ui', { recursive: true })
writeFileSync('dist/ui/kit.css', `${tokens}\n${styles}`)
console.log('dist/ui/kit.css written')
