import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** items: [{ label, to? }] — the last item is the current page. */
export function Breadcrumb({ items }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('common.breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.to && !isLast ? (
                <Link to={item.to} className="rounded-sm hover:text-text focus-visible:outline-2 focus-visible:outline-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'font-medium text-text-2' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={13} className="text-faint rtl:-scale-x-100" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
