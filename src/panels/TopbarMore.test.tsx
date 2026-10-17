import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TopbarMore } from './TopbarMore'

// jsdom cannot evaluate the ≤ 900 px media query, so these tests check behaviour and markup only.

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
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(menu.getAttribute('data-open')).toBe('true')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(menu.getAttribute('data-open')).toBe('false')
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

  it('renders each child once', () => {
    const { button } = renderMore(<button>Gamma</button>)
    expect(screen.getAllByRole('button', { name: 'Alpha' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Gamma' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '≡ MORE' })).toHaveLength(1)
    expect(button.getAttribute('aria-controls')).toBeTruthy()
  })
})
