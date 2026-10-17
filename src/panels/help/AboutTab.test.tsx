import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AboutTab } from './AboutTab'
import { CAMERA_CREDITS, CREDITS, DISCLAIMER, PROJECT } from './about'

afterEach(() => {
  cleanup()
})

describe('AboutTab', () => {
  it('shows the disclaimer in a note landmark', () => {
    render(<AboutTab />)
    const note = screen.getByRole('note')
    expect(note.textContent).toContain(DISCLAIMER)
  })

  it('renders the version from __APP_VERSION__', () => {
    render(<AboutTab />)
    expect(screen.getByText(`v${__APP_VERSION__}`).className).toContain('about-version')
    expect(screen.getByText(PROJECT.descriptor, { exact: false })).toBeTruthy()
  })

  it('renders a new-tab link with noopener for every credit', () => {
    const { container } = render(<AboutTab />)
    for (const credit of CREDITS) {
      const link = container.querySelector(`a[href="${credit.url}"]`)
      expect(link, credit.who).not.toBeNull()
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(link?.getAttribute('rel')).toContain('noopener')
    }
  })

  it('links the source repository in a new tab', () => {
    const { container } = render(<AboutTab />)
    const link = container.querySelector(`a[href="${PROJECT.repo}"]`)
    expect(link?.textContent).toContain('SOURCE ON GITHUB')
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('names the new-tab behaviour in the accessible name and hides the glyph', () => {
    const { container } = render(<AboutTab />)
    const glyph = container.querySelector('.about-ext')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('link', { name: /SOURCE ON GITHUB.*\(opens in a new tab\)/ })).toBeTruthy()
  })

  it('lists every traffic camera site', () => {
    render(<AboutTab />)
    for (const cam of CAMERA_CREDITS) {
      expect(screen.getAllByText(cam.site).length).toBeGreaterThan(0)
    }
  })

  it('renders a glossary acronym in a credit as an abbr with a title', () => {
    render(<AboutTab />)
    const spc = screen.getByText('SPC', { selector: 'abbr' })
    expect(spc.getAttribute('title')).toBeTruthy()
  })

  it('tips DOT in the camera lead and in each agency name', () => {
    const { container } = render(<AboutTab />)
    const lead = container.querySelector('.about-cams-lead abbr')
    expect(lead?.textContent).toBe('DOT')
    expect(lead?.getAttribute('title')).toBeTruthy()
    const agencyTips = container.querySelectorAll('.about-camera-agency abbr')
    expect(agencyTips.length).toBeGreaterThan(10)
  })
})
