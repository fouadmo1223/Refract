import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getToolAccent } from '@/constants/tools'
import { Badge } from '@/components/ui/misc'

const MotionLink = motion.create(Link)

/**
 * Tool entry used in listings. Each tool has its own accent color, used on
 * hover for the border, icon tile and title. "Soon" tools are inert.
 */
export function ToolCard({ tool, onClick, compact = false, lastUsed = false, dragging = false, className }) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const isSoon = tool.status === 'soon'
  const content = (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors duration-[var(--duration-base)]',
          compact ? 'size-8' : 'size-9',
          isSoon
            ? 'bg-surface-2 text-faint ring-border'
            : 'bg-surface-2 text-text-2 ring-border group-hover:bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] group-hover:text-[var(--accent)] group-hover:ring-transparent group-focus-visible:text-[var(--accent)]',
        )}
      >
        <Icon size={compact ? 16 : 18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className={cn('truncate font-semibold text-text transition-colors group-hover:text-[color-mix(in_oklab,var(--accent)_75%,var(--text))]', compact ? 'text-[13px]' : 'text-sm')}>
            {t(`tools.${tool.id}.title`)}
          </h3>
          {isSoon && <Badge>{t('common.soon')}</Badge>}
          {lastUsed && (
            <Badge tone="primary" icon={History} className="shrink-0">
              {t('toolPrefs.lastUsed')}
            </Badge>
          )}
        </div>
        {!compact && <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{t(`tools.${tool.id}.short`)}</p>}
      </div>
    </>
  )

  const classes = cn(
    'group flex items-start gap-3 rounded-lg border bg-surface text-start outline-none',
    'transition-[border-color,box-shadow,background-color] duration-[var(--duration-base)] focus-visible:ring-3 focus-visible:ring-ring',
    compact ? 'items-center p-3' : 'p-4',
    lastUsed ? 'border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]' : 'border-border',
    isSoon
      ? 'cursor-default opacity-70'
      : 'hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:bg-[color-mix(in_oklab,var(--accent)_4%,var(--surface))] hover:shadow-md',
    dragging && 'border-[var(--accent)] shadow-lg',
    className,
  )
  const style = { '--accent': getToolAccent(tool.id) }

  if (isSoon) {
    return (
      <div className={classes} style={style} aria-disabled="true">
        {content}
      </div>
    )
  }
  return (
    <MotionLink to={tool.path} onClick={onClick} className={classes} style={style} whileHover={dragging ? undefined : { y: -2 }} transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }} draggable={false}>
      {content}
    </MotionLink>
  )
}
