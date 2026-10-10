import type { ButtonHTMLAttributes } from 'react'

export interface ConsoleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `outline` (default) accent-bordered; `quiet` borderless muted, for secondary actions. */
  variant?: 'outline' | 'quiet'
  /** Marks a toggle/selected state (rendered via aria-pressed). */
  pressed?: boolean
}

/** Uppercase monospace console button used for presets, playback and panel actions. */
export function ConsoleButton({ variant = 'outline', pressed, className, type = 'button', ...rest }: ConsoleButtonProps) {
  const classes = ['btn-console', variant === 'quiet' && 'btn-console-quiet', className].filter(Boolean).join(' ')
  return <button type={type} className={classes} aria-pressed={pressed} {...rest} />
}
