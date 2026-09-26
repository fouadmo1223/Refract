import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M9 23V9h8.5a4.5 4.5 0 0 1 0 9H13" fill="none" className="stroke-primary-fg" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 18l6 5" className="stroke-primary-fg" strokeOpacity="0.6" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ onClick }) {
  const { t } = useTranslation()
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('nav.homeLabel')}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-text" dir="ltr">
        {t('app.name')}
      </span>
    </Link>
  )
}
