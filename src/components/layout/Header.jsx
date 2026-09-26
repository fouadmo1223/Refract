import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/uiStore'
import { Drawer } from '@/components/ui/Drawer'
import { IconButton } from '@/components/ui/IconButton'
import { Kbd } from '@/components/ui/misc'
import { Logo } from './Logo'
import { LanguageMenu, PreferenceFields, ThemeMenu } from './PreferenceControls'
import { RecentJobsMenu } from './RecentJobsMenu'

const NAV_ITEMS = [
  { to: '/image-tools', key: 'nav.imageTools' },
  { to: '/video-tools', key: 'nav.videoTools' },
  { to: '/ai-tools', key: 'nav.aiStudio' },
  { to: '/tools', key: 'nav.allTools' },
]

function navClass({ isActive }) {
  return cn(
    'rounded-md px-2.5 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
    isActive ? 'text-text bg-surface-2' : 'text-muted hover:text-text',
  )
}

export function Header() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const openCommandPalette = useUiStore((state) => state.openCommandPalette)
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label={t('nav.primary')} className="ms-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden h-8 w-56 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[13px] text-faint shadow-xs outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring md:flex lg:w-64"
          >
            <Search size={15} aria-hidden="true" />
            <span className="flex-1 text-start">{t('search.trigger')}</span>
            <span className="flex items-center gap-0.5" dir="ltr">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <IconButton icon={Search} label={t('search.title')} onClick={openCommandPalette} className="md:hidden" />
          <div className="hidden items-center gap-0.5 md:flex">
            <span className="mx-1.5 h-5 w-px bg-border" aria-hidden="true" />
            <RecentJobsMenu />
            <LanguageMenu />
            <ThemeMenu />
          </div>
          <IconButton icon={Menu} label={t('nav.openMenu')} onClick={() => setMenuOpen(true)} className="md:hidden" />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={t('nav.menu')} side="end">
        <nav aria-label={t('nav.primary')} className="flex flex-col gap-0.5">
          {[{ to: '/', key: 'nav.home' }, ...NAV_ITEMS, { to: '/about', key: 'nav.about' }, { to: '/privacy', key: 'nav.privacy' }].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => cn('rounded-md px-3 py-2.5 text-sm font-medium', isActive ? 'bg-surface-2 text-text' : 'text-text-2 hover:bg-surface-2')}
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 border-t border-border pt-5">
          <PreferenceFields />
        </div>
      </Drawer>
    </header>
  )
}
