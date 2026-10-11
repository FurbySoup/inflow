// Writes dist/ui/kit.css = tokens.css + styles.css with its component @imports inlined: the single stylesheet
// the Claude Design sync ships (cfg.cssEntry). The app imports tokens.css and styles.css from src/index.css;
// the converter doesn't follow relative @imports, so they are resolved here.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

function inline(path) {
  const css = readFileSync(path, 'utf8')
  return css.replace(/^@import '(\.[^']+)';\s*$/gm, (_, rel) => inline(join(dirname(path), rel)))
}

mkdirSync('dist/ui', { recursive: true })
writeFileSync('dist/ui/kit.css', `${readFileSync('src/ui/tokens.css', 'utf8')}\n${inline('src/ui/styles.css')}`)
console.log('dist/ui/kit.css written')
