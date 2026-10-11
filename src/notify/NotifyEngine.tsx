import { useEffect } from 'react'
import { subscribeNotify } from '../state/notify'
import { createEngine } from './engine'
import { useNotifyTriggers } from './useNotifyTriggers'

/**
 * Mounted once in the app (ADR-0019). Renders nothing. It runs the polling triggers and delivers every bus event:
 * a system notification while the tab is hidden, otherwise an in-app count on the top-bar control.
 */
export function NotifyEngine() {
  useEffect(() => {
    const engine = createEngine()
    const unsubscribe = subscribeNotify((event) => engine.handle(event))
    const onVisibility = () => {
      if (document.visibilityState === 'visible') engine.onVisible()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      engine.dispose()
    }
  }, [])

  useNotifyTriggers()
  return null
}
