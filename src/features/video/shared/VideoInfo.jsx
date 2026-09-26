import { useTranslation } from 'react-i18next'
import { getExtension } from '@/lib/files'
import { formatBytes, formatDimensions, formatDuration } from '@/lib/format'

/** Compact source summary: size · resolution · duration · format. */
export function VideoInfo({ file, meta }) {
  const { t } = useTranslation()
  const rows = [
    { label: t('result.fileSize'), value: formatBytes(file.size) },
    { label: t('result.resolution'), value: meta?.width ? formatDimensions(meta.width, meta.height) : '—' },
    { label: t('result.duration'), value: meta?.duration ? formatDuration(meta.duration) : '—' },
    { label: t('result.format'), value: getExtension(file.name).toUpperCase() },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-surface-2 px-3 py-2.5 sm:grid-cols-4 lg:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-2xs text-muted">{row.label}</dt>
          <dd className="tabular truncate text-[13px] font-medium text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
