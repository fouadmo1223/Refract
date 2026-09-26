import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogoMark } from './Logo'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark size={20} />
          <span>{t('footer.tagline')}</span>
        </div>
        <nav aria-label={t('footer.label')} className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/tools" className="hover:text-text">{t('nav.allTools')}</Link>
          <Link to="/about" className="hover:text-text">{t('nav.about')}</Link>
          <Link to="/privacy" className="hover:text-text">{t('nav.privacy')}</Link>
        </nav>
      </div>
    </footer>
  )
}
