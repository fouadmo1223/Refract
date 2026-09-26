import { Link } from 'react-router-dom'
import { History, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getTool } from '@/constants/tools'
import { formatRelativeTime } from '@/lib/format'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Popover } from '@/components/ui/Popover'

const STATUS_TONE = { completed: 'bg-success', failed: 'bg-danger', canceled: 'bg-faint' }

/** In-session job history (metadata only — files are never stored). */
export function RecentJobsMenu() {
  const { t } = useTranslation()
  const jobs = useRecentJobsStore((state) => state.jobs)
  const clearJobs = useRecentJobsStore((state) => state.clearJobs)

  return (
    <Popover
      label={t('recent.title')}
      placement="bottom-end"
      className="w-80 p-0"
      trigger={<IconButton icon={History} label={t('recent.title')} />}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-text">{t('recent.title')}</p>
              <p className="text-2xs text-muted">{t('recent.subtitle')}</p>
            </div>
            {jobs.length > 0 && (
              <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={clearJobs}>
                {t('recent.clear')}
              </Button>
            )}
          </div>
          {jobs.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted">{t('recent.empty')}</p>
          ) : (
            <ul className="scrollbar-thin max-h-80 overflow-y-auto p-1">
              {jobs.map((job) => {
                const tool = getTool(job.toolId)
                if (!tool) return null
                const Icon = tool.icon
                return (
                  <li key={job.id}>
                    <Link to={tool.path} onClick={close} className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-surface-2">
                      <Icon size={15} className="shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-text" dir="auto">
                          {job.fileName ?? t(`tools.${tool.id}.title`)}
                        </span>
                        <span className="block truncate text-2xs text-muted">
                          {t(`tools.${tool.id}.title`)} · {formatRelativeTime(job.timestamp)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-2xs text-muted">
                        <span className={cn('size-1.5 rounded-full', STATUS_TONE[job.status])} aria-hidden="true" />
                        {t(`recent.status.${job.status}`)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}
