import { describe, expect, it } from 'vitest'
import { expand } from '../ui'
import { labelNodes, layerMatches } from './LayerControl'

function host(nodes: Node[]): HTMLElement {
  const el = document.createElement('span')
  el.append(...nodes)
  return el
}

describe('labelNodes', () => {
  it('tags each glossary word in a layer label and keeps the text', () => {
    const el = host(labelNodes('GOES IR'))
    const abbrs = el.querySelectorAll('abbr.abbr[title]')
    expect(abbrs).toHaveLength(2)
    expect(abbrs[0].textContent).toBe('GOES')
    expect(abbrs[0].getAttribute('title')).toBe(expand('GOES'))
    expect(abbrs[1].textContent).toBe('IR')
    expect(abbrs[1].getAttribute('title')).toBe(expand('IR'))
    expect(el.textContent).toBe('GOES IR')
  })

  it('tags words inside punctuation and leaves ordinary words plain', () => {
    const el = host(labelNodes('Velocity (SRV, nearest radar)'))
    expect(el.querySelectorAll('abbr')).toHaveLength(1)
    expect(el.querySelector('abbr')?.textContent).toBe('SRV')
    expect(el.textContent).toBe('Velocity (SRV, nearest radar)')
  })

  it('leaves a label with no glossary words as plain text', () => {
    const el = host(labelNodes('Storm Reports (today)'))
    expect(el.querySelectorAll('abbr')).toHaveLength(0)
    expect(el.textContent).toBe('Storm Reports (today)')
  })
})

describe('layerMatches', () => {
  it('matches every style layer whose id starts with the overlay id', () => {
    expect(layerMatches('radar-m50', 'radar')).toBe(true)
    expect(layerMatches('radar-m00', 'radar')).toBe(true)
    expect(layerMatches('spc-outlook-line', 'spc-outlook')).toBe(true)
    expect(layerMatches('alerts-fill', 'alerts')).toBe(true)
  })

  it('does not match unrelated or shorter ids', () => {
    expect(layerMatches('satellite', 'radar')).toBe(false)
    expect(layerMatches('radar', 'radar-m50')).toBe(false)
    expect(layerMatches('storm-reports', 'alerts')).toBe(false)
    expect(layerMatches('radarx-m00', 'radar')).toBe(false)
    expect(layerMatches('satellite', 'satellite')).toBe(true)
  })
})
