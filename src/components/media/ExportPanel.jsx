import { useState } from 'react'
import { Check, Download, Pencil, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { downloadBlob } from '@/lib/download'
import { getBaseName, sanitizeFileName } from '@/lib/files'
import { formatBytes, formatDimensions, formatDuration } from '@/lib/format'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'

/**
 * Reusable download panel: filename (renamable), format, dimensions, size,
 * then Download / Process another. Nothing downloads until the user asks.
 */
export function ExportPanel({ blob, fileName, extension, width, height, duration, onProcessAnother, extraActions, formatLabel }) {
  const { t } = useTranslation()
  const [baseName, setBaseName] = useState(() => getBaseName(fileName))
  const [draft, setDraft] = useState(null)
  const isEditing = draft != null
  const draftError = isEditing && !sanitizeFileName(draft) ? t('validation.fileNameRequired') : null
  const fullName = `${baseName}.${extension}`

  const commitRename = () => {
    if (draftError) return
    setBaseName(sanitizeFileName(draft))
    setDraft(null)
  }
  const handleDownload = () => {
    downloadBlob(blob, fullName)
    notify.success('toasts.downloadStarted')
  }

  const rows = [
    { label: t('result.format'), value: formatLabel ?? extension.toUpperCase() },
    width && height ? { label: t('result.dimensions'), value: formatDimensions(width, height) } : null,
    duration ? { label: t('result.duration'), value: formatDuration(duration) } : null,
    { label: t('result.fileSize'), value: formatBytes(blob.size) },
  ].filter(Boolean)

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-muted">{t('result.fileName')}</p>
        {isEditing ? (
          <form
            className="mt-1.5 flex items-start gap-1.5"
            onSubmit={(event) => {
              event.preventDefault()
              commitRename()
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex h-8 items-center rounded-md border border-primary bg-surface ring-3 ring-ring">
                <input
                  autoFocus
                  aria-label={t('result.fileName')}
                  aria-invalid={Boolean(draftError) || undefined}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === 'Escape' && setDraft(null)}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none"
                  dir="auto"
                />
                <span className="pe-2 text-xs text-muted">.{extension}</span>
              </div>
              {draftError && <p className="mt-1 text-xs text-danger">{draftError}</p>}
            </div>
            <IconButton icon={Check} label={t('common.save')} size="sm" type="submit" variant="subtle" />
          </form>
        ) : (
          <div className="mt-0.5 flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-text" title={fullName} dir="auto">
              {fullName}
            </p>
            <IconButton icon={Pencil} label={t('result.rename')} size="xs" onClick={() => setDraft(baseName)} />
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-muted">{row.label}</dt>
            <dd className="tabular mt-0.5 truncate text-[13px] font-medium text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <Button variant="primary" size="lg" fullWidth leftIcon={Download} onClick={handleDownload}>
          {t('common.download')}
        </Button>
        {extraActions}
        {onProcessAnother && (
          <Button variant="ghost" fullWidth leftIcon={RotateCcw} onClick={onProcessAnother}>
            {t('common.processAnother')}
          </Button>
        )}
      </div>
    </div>
  )
}
