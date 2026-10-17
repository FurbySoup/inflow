import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LayoutMenu } from './LayoutMenu'
import { clampLeft, TopbarMore } from './TopbarMore'

// jsdom cannot evaluate the ≤ 900 px media query, so these tests check behaviour and markup only.
// Its rects are zero, so the placement test checks the inline position against the fallback values.

afterEach(cleanup)

function renderMore(extra?: ReactNode) {
  render(
    <TopbarMore>
      <button>Alpha</button>
      <button>Beta</button>
      {extra}
    </TopbarMore>,
  )
  const button = screen.getByRole('button', { name: '≡ MORE' })
  const menu = document.querySelector<HTMLElement>('.topbar-more')
  if (!menu) throw new Error('menu group missing')
  return { button, menu }
}

describe('TopbarMore', () => {
  it('toggles data-open and aria-expanded from the button', () => {
    const { button, menu } = renderMore()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(menu.getAttribute('data-open')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe(menu.id)

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.hasAttribute('aria-pressed')).toBe(false)
    expect(menu.getAttribute('data-open')).toBe('true')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(menu.getAttribute('data-open')).toBe('false')
  })

  it('closes when the window grows past the narrow tier', () => {
    const { button, menu } = renderMore()
    fireEvent.click(button)
    expect(menu.getAttribute('data-open')).toBe('true')
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia
    try {
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      expect(menu.getAttribute('data-open')).toBe('false')
      expect(button.getAttribute('aria-expanded')).toBe('false')
    } finally {
      window.matchMedia = original
    }
  })

  it('moves focus to the first control when opened', () => {
    const { button } = renderMore()
    fireEvent.click(button)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alpha' }))
  })

  it('closes on Escape and returns focus to the MORE button', () => {
    const { button, menu } = renderMore()
    fireEvent.click(button)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Alpha' }), { key: 'Escape' })
    expect(menu.getAttribute('data-open')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  it('leaves Escape to a nested notify popover that is open', () => {
    const { button, menu } = renderMore(<div className="notify-pop">Settings</div>)
    fireEvent.click(button)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Alpha' }), { key: 'Escape' })
    expect(menu.getAttribute('data-open')).toBe('true')
  })

  it('closes on an outside mousedown but not on one inside', () => {
    const { button, menu } = renderMore()
    fireEvent.click(button)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Beta' }))
    expect(menu.getAttribute('data-open')).toBe('true')

    fireEvent.mouseDown(document.body)
    expect(menu.getAttribute('data-open')).toBe('false')
  })

  it('closes when HELP is chosen so the help dialog is not covered', () => {
    const { button, menu } = renderMore(<button>? HELP</button>)
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: '? HELP' }))
    expect(menu.getAttribute('data-open')).toBe('false')
  })

  it('places the open popover fixed under the button, inside the gutter', () => {
    const { button, menu } = renderMore()
    expect(menu.style.top).toBe('')
    fireEvent.click(button)
    // Zero rects and a zero-width popover: top is the 6 px gap, left is the 12 px gutter.
    expect(menu.style.top).toBe('6px')
    expect(menu.style.left).toBe('12px')
  })

  it('renders the LAYOUT label once, as plain text that is not focusable', () => {
    render(
      <TopbarMore>
        <LayoutMenu />
      </TopbarMore>,
    )
    const labels = screen.getAllByText('LAYOUT')
    expect(labels).toHaveLength(1)
    expect(labels[0]?.matches('button, a[href], input, [tabindex]')).toBe(false)
    expect(labels[0]?.tagName).toBe('SPAN')
  })

  it('renders each child once', () => {
    const { button } = renderMore(<button>Gamma</button>)
    expect(screen.getAllByRole('button', { name: 'Alpha' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Gamma' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '≡ MORE' })).toHaveLength(1)
    expect(button.getAttribute('aria-controls')).toBeTruthy()
  })
})

describe('clampLeft', () => {
  it('right-aligns the popover to the button when there is room', () => {
    expect(clampLeft(300, 200, 390)).toBe(100)
  })

  it('keeps a popover from overflowing the left edge', () => {
    // Button at the far left: right-aligning would start at -166.
    expect(clampLeft(40, 206, 390)).toBe(12)
  })

  it('keeps a popover from overflowing the right edge', () => {
    expect(clampLeft(390, 100, 390)).toBe(278)
  })

  it('pins to the left gutter when the popover is wider than the viewport', () => {
    expect(clampLeft(300, 500, 390)).toBe(12)
  })

  it('honours a custom gutter', () => {
    expect(clampLeft(40, 206, 390, 4)).toBe(4)
  })
})
