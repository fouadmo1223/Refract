import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useThemeSync } from '@/hooks/useTheme'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { PageLoader } from '@/components/feedback/States'
import { Toaster } from '@/components/feedback/Toaster'
import { CommandPalette } from './CommandPalette'
import { Footer } from './Footer'
import { Header } from './Header'

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  useThemeSync()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('nav.skipToContent')}
      </a>
      <Header />
      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
              <Outlet />
            </motion.div>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CommandPalette />
      <Toaster />
    </div>
  )
}
