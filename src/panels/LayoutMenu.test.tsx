import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLayout } from '../state/layout'
import { LayoutMenu } from './LayoutMenu'

afterEach(cleanup)

beforeEach(() => {
  window.localStorage.clear()
  useLayout.getState().applyPreset('DEFAULT')
})

describe('LayoutMenu', () => {
  it('gives each preset button a tooltip and keeps its aria-label as the accessible name', () => {
    render(<LayoutMenu />)
    const expected: Record<string, string> = {
      DEFAULT: 'Everything on one screen',
      WALL: 'Map, warnings and video, sized for a TV or second monitor',
      CHASE: 'One stream, radio and warnings, for a laptop in the car',
    }
    for (const [name, title] of Object.entries(expected)) {
      const button = screen.getByRole('button', { name: `Apply ${name} layout` })
      expect(button.textContent).toBe(name)
      expect(button.getAttribute('title')).toBe(title)
    }
  })

  it('gives RESET a tooltip and the outlined style, not the quiet one', () => {
    render(<LayoutMenu />)
    const reset = screen.getByRole('button', { name: 'Reset layout to default' })
    expect(reset.textContent).toBe('RESET')
    expect(reset.getAttribute('title')).toBe('Reset sizes to DEFAULT')
    expect(reset.className).toContain('btn-console')
    expect(reset.className).not.toContain('btn-console-quiet')
  })

  it('marks the default DEFAULT preset as pressed on load', () => {
    render(<LayoutMenu />)
    expect(screen.getByRole('button', { name: 'Apply DEFAULT layout' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Apply WALL layout' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('applies WALL on click and moves the pressed state to it', () => {
    render(<LayoutMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Apply WALL layout' }))
    expect(useLayout.getState().preset).toBe('WALL')
    expect(screen.getByRole('button', { name: 'Apply WALL layout' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Apply DEFAULT layout' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('RESET applies DEFAULT', () => {
    render(<LayoutMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Apply CHASE layout' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset layout to default' }))
    expect(useLayout.getState().preset).toBe('DEFAULT')
  })

  it('shows the LAYOUT label, muted and not interactive, ahead of the buttons', () => {
    render(<LayoutMenu />)
    const label = screen.getByText('LAYOUT')
    expect(label.className).toBe('topbar-more-label')
    expect(label.getAttribute('title')).toBeNull()
    expect(label.matches('button, a[href], input, [tabindex]')).toBe(false)
  })
})
