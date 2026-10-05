import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, FileArchive, FileVideo, ImagePlus, Play, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getAcceptString } from '@/constants/fileConstraints'
import { createZip, downloadBlob } from '@/lib/download'
import { getErrorMessage } from '@/lib/errors'
import { validateFile } from '@/lib/files'
import { formatBytes, formatPercent } from '@/lib/format'
import { notify } from '@/lib/notify'
import { useBatchQueue } from '@/hooks/useBatchQueue'
import { useMediaMeta } from '@/hooks/useMediaMeta'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/Progress'
import { LoadingState } from '@/components/feedback/States'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ResultStats } from '@/components/media/ResultStats'
import { SettingsPanel, SettingsSection } from './Panels'

const STATUS_STYLES = {
  idle: 'text-muted',
  waiting: 'text-muted',
  processing: 'text-primary',
  completed: 'text-success',
  failed: 'text-danger',
  canceled: 'text-muted',
}

const BatchRow = memo(function BatchRow({ item, selected, customized, kind, onSelect, onCancel, onRemove, onRetry, onDownload, busy }) {
  const { t } = useTranslation()
  const thumbnail = useObjectUrl(kind === 'image' ? item.file : null)
  const output = item.result?.blob
  const saved = output ? 1 - output.size / item.file.size : null
  const errorText = item.error ? getErrorMessage(t, item.error).title : null

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn('flex items-center gap-3 px-3 py-2.5 transition-colors', selected ? 'bg-primary-soft/50' : 'hover:bg-surface-2/60')}
    >
      <button type="button" onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-pressed={selected}>
        <div className="checkerboard flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-inset ring-border">
          {thumbnail ? <img src={thumbnail} alt="" className="size-full object-cover" loading="lazy" /> : <FileVideo size={18} className="text-muted" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-text" title={item.file.name}>
              <span className="truncate" dir="auto">
                {item.file.name}
              </span>
              {customized && (
                <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-px text-2xs font-semibold text-primary-soft-fg" title={t('multi.customizedHint')}>
                  {t('multi.custom')}
                </span>
              )}
            </p>
            <span className={cn('tabular shrink-0 text-xs font-medium', STATUS_STYLES[item.status])}>
              {item.status === 'processing' ? formatPercent(item.progress) : t(`batch.status.${item.status}`)}
            </span>
          </div>
          {item.status === 'processing' ? (
            <ProgressBar value={item.progress} size="sm" className="mt-2" label={item.file.name} />
          ) : (
            <p className={cn('tabular mt-0.5 truncate text-xs', item.status === 'failed' ? 'text-danger' : 'text-muted')}>
              {item.status === 'completed' && output ? (
                <>
                  {formatBytes(item.file.size)} → <span className="font-medium text-text">{formatBytes(output.size)}</span>
                  {saved != null && Math.abs(saved) > 0.005 && (
                    <span className={saved > 0 ? 'text-success' : 'text-muted'}>
                      {' '}
                      ({saved > 0 ? '−' : '+'}
                      {formatPercent(Math.abs(saved))})
                    </span>
                  )}
                </>
              ) : item.status === 'failed' ? (
                errorText
              ) : (
                formatBytes(item.file.size)
              )}
            </p>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {(item.status === 'processing' || item.status === 'waiting') && <IconButton icon={X} label={t('common.cancel')} size="sm" onClick={() => onCancel(item.id)} />}
        {(item.status === 'failed' || item.status === 'canceled') && <IconButton icon={RotateCcw} label={t('common.retry')} size="sm" onClick={() => onRetry(item.id)} />}
        {item.status === 'completed' && <IconButton icon={Download} label={t('common.download')} size="sm" onClick={() => onDownload(item)} />}
        <IconButton icon={SlidersHorizontal} label={t('multi.customize')} size="sm" onClick={() => onSelect(item.id)} disabled={busy} />
        {item.status !== 'processing' && <IconButton icon={Trash2} label={t('common.removeFile')} size="sm" variant="danger-ghost" onClick={() => onRemove(item.id)} />}
      </div>
    </motion.li>
  )
})

/** Settings for one file; loads that file's metadata so tool controls (format hints, sizes) stay accurate. */
function ItemSettings({ item, loadMeta, toolId, render, settings, onChange }) {
  const meta = useMediaMeta(item.file, loadMeta, { key: `${toolId}-batch` })
  if (loadMeta && !meta.data) return meta.isError ? null : <LoadingState />
  return render({ file: item.file, meta: meta.data, settings, updateSettings: onChange })
}

/**
 * Multi-file mode of the tool flow. Every file uses the shared settings unless
 * it's customized; each file's settings are captured when processing starts.
 *
 * @param {object} props
 * @param {File[]} props.initialFiles
 * @param {object} props.batch { settings, updateSettings, renderSettings({ file, meta, settings, updateSettings }), process({ file, settings, signal, onProgress }), outputName(file, result, settings), canProcess?(settings) }
 */
export function BatchWorkspace({ toolId, profile, loadMeta, initialFiles, batch, actionLabel, actionIcon: ActionIcon = Play, onExit, maxFiles = 50 }) {
  const { t } = useTranslation()
  const addJob = useRecentJobsStore((state) => state.addJob)
  // Tools may need the file's metadata (duration, size…) to process it.
  const queue = useBatchQueue(async (file, job, context) => batch.process({ file, settings: job, meta: loadMeta ? await loadMeta(file).catch(() => null) : null, ...context }))
  const [overrides, setOverrides] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [isZipping, setIsZipping] = useState(false)
  const addInputRef = useRef(null)
  const seeded = useRef(false)
  const kind = profile.kind === 'video' ? 'video' : 'image'

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    queue.addFiles(initialFiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { items } = queue
  const selected = items.find((item) => item.id === selectedId) ?? null
  const settingsFor = (item) => overrides[item.id] ?? batch.settings
  const busy = items.some((item) => item.status === 'processing' || item.status === 'waiting')
  const completed = items.filter((item) => item.status === 'completed')
  const pending = items.filter((item) => ['idle', 'failed', 'canceled'].includes(item.status))
  const customizedCount = items.filter((item) => overrides[item.id]).length
  const totals = useMemo(() => {
    const before = completed.reduce((sum, item) => sum + item.file.size, 0)
    const after = completed.reduce((sum, item) => sum + (item.result?.blob?.size ?? 0), 0)
    return { before, after }
  }, [completed])
  const allValid = items.every((item) => batch.canProcess?.(settingsFor(item)) ?? true)

  const addFiles = (fileList) => {
    const room = maxFiles - items.length
    const valid = []
    for (const file of [...(fileList ?? [])].slice(0, Math.max(0, room))) {
      try {
        valid.push(validateFile(file, profile))
      } catch (error) {
        notify.error(error)
      }
    }
    if (valid.length) queue.addFiles(valid)
  }

  const nameFor = (item) => batch.outputName(item.file, item.result, item.job ?? settingsFor(item))
  const downloadOne = (item) => downloadBlob(item.result.blob, nameFor(item))
  const downloadAll = async () => {
    setIsZipping(true)
    try {
      const names = new Map()
      const entries = completed.map((item) => {
        // Keep names unique inside the archive.
        let name = nameFor(item)
        const count = names.get(name) ?? 0
        names.set(name, count + 1)
        if (count) name = name.replace(/(\.[^.]+)$/, `-${count + 1}$1`)
        return { name, blob: item.result.blob }
      })
      downloadBlob(await createZip(entries), `${toolId}-${completed.length}-files.zip`)
    } catch (error) {
      notify.error(error)
    } finally {
      setIsZipping(false)
    }
  }

  const startAll = () => {
    if (!pending.length) queue.resetAll()
    const snapshot = { ...overrides }
    queue.startAll((item) => snapshot[item.id] ?? batch.settings)
    setSelectedId(null)
    addJob({ toolId, fileName: t('multi.filesCount', { count: items.length }), status: 'completed' })
  }

  const editing = selected ? settingsFor(selected) : batch.settings
  const updateEditing = (patch) => {
    if (!selected) return batch.updateSettings(patch)
    setOverrides((current) => ({ ...current, [selected.id]: { ...(current[selected.id] ?? batch.settings), ...patch } }))
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      <input
        ref={addInputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={getAcceptString(profile.types)}
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <p className="tabular text-[13px] font-medium text-text">{t('multi.filesCount', { count: items.length })}</p>
          {customizedCount > 0 && <span className="text-xs text-muted">· {t('multi.customizedCount', { count: customizedCount })}</span>}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => {
              queue.clear()
              onExit()
            }} disabled={busy}>
            {t('common.clear')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={ImagePlus} onClick={() => addInputRef.current?.click()} disabled={items.length >= maxFiles}>
            {t('multi.addFiles')}
          </Button>
        </div>
        <ul className="max-h-[68vh] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface scrollbar-thin">
          {items.map((item) => (
            <BatchRow
              key={item.id}
              item={item}
              kind={kind}
              busy={busy}
              selected={item.id === selectedId}
              customized={Boolean(overrides[item.id])}
              onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
              onCancel={queue.cancelItem}
              onRetry={(id) => queue.retryItem(id, settingsFor(items.find((entry) => entry.id === id)))}
              onRemove={(id) => {
                queue.removeItem(id)
                setOverrides(({ [id]: _removed, ...rest }) => rest)
                if (selectedId === id) setSelectedId(null)
                if (items.length === 1) onExit()
              }}
              onDownload={downloadOne}
            />
          ))}
        </ul>
        {completed.length > 0 && (
          <ResultStats
            stats={[
              { label: t('multi.done'), value: `${completed.length} / ${items.length}` },
              { label: t('result.before'), value: formatBytes(totals.before) },
              { label: t('result.after'), value: formatBytes(totals.after) },
            ]}
          />
        )}
      </div>

      <SettingsPanel
        footer={
          <>
            <Button variant="primary" size="lg" fullWidth leftIcon={ActionIcon} onClick={startAll} disabled={busy || !items.length || !allValid} loading={busy}>
              {pending.length || !completed.length ? t('multi.processAll', { action: actionLabel, count: pending.length || items.length }) : t('multi.processAgain')}
            </Button>
            {completed.length > 1 && (
              <Button variant="secondary" fullWidth leftIcon={FileArchive} onClick={downloadAll} loading={isZipping} disabled={busy}>
                {t('batch.downloadAllZip', { count: completed.length })}
              </Button>
            )}
          </>
        }
      >
        <SettingsSection
          title={selected ? t('multi.settingsFor') : t('multi.sharedSettings')}
          description={selected ? undefined : t('multi.sharedHint')}
          action={
            selected && (
              <Button variant="ghost" size="xs" leftIcon={ArrowLeft} onClick={() => setSelectedId(null)}>
                {t('multi.allFiles')}
              </Button>
            )
          }
        >
          {selected && (
            <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-text" dir="auto">
                {selected.file.name}
              </p>
              {overrides[selected.id] ? (
                <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => setOverrides(({ [selected.id]: _removed, ...rest }) => rest)}>
                  {t('multi.useShared')}
                </Button>
              ) : (
                <span className="text-2xs text-muted">{t('multi.usingShared')}</span>
              )}
            </div>
          )}
        </SettingsSection>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
          {selected ? (
            <ItemSettings key={selected.id} item={selected} loadMeta={loadMeta} toolId={toolId} render={batch.renderSettings} settings={editing} onChange={updateEditing} />
          ) : (
            batch.renderSettings({ file: null, meta: null, settings: batch.settings, updateSettings: batch.updateSettings })
          )}
        </fieldset>
        <PrivacyNote />
      </SettingsPanel>
    </div>
  )
}
