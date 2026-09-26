import { useEffect } from 'react'
import { usePreferencesStore } from '@/store/preferencesStore'
import { useMediaQuery } from './useMediaQuery'

/** Resolve 'system' into the actual 'light' | 'dark'. */
export function useResolvedTheme() {
  const theme = usePreferencesStore((state) => state.theme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
}

/** Keep the <html> class and theme-color meta in sync — no reload needed. */
export function useThemeSync() {
  const resolved = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('[&_*]:!transition-none')
    root.classList.toggle('dark', resolved === 'dark')
    // Avoid every element animating its colors during the switch.
    const frame = requestAnimationFrame(() => root.classList.remove('[&_*]:!transition-none'))
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', resolved === 'dark' ? '#0E1013' : '#F7F8FA'))
    return () => cancelAnimationFrame(frame)
  }, [resolved])
  return resolved
}
