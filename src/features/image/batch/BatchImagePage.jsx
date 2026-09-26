import { useCallback, useMemo, useState } from 'react'
import { FileArchive, Info, Play, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BATCH_MAX_FILES, UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { COMPRESSIBLE_FORMATS, CONVERTIBLE_FORMATS, getImageFormat } from '@/constants/imageFormats'
import { createZip, downloadBlob } from '@/lib/download'
import { buildOutputName } from '@/lib/files'
import { formatBytes, formatPercent } from '@/lib/format'
import { notify } from '@/lib/notify'
import { compressImage } from '@/services/image/imageCompressionService'
import { convertImage } from '@/services/image/imageConversionService'
import { resizeImage } from '@/services/image/imageResizeService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { NumberInput } from '@/components/ui/NumberInput'
import { Slider } from '@/components/ui/Slider'
import { Tabs } from '@/components/ui/Tabs'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ResultStats } from '@/components/media/ResultStats'
import { FormatSelect } from '../shared/FormatSelect'
import { QualityControl } from '../shared/QualityControl'
import { useBatchQueue } from './useBatchQueue'
import { BatchQueueItem } from './BatchQueueItem'

const TOOL_ID = 'image-batch'
const DEFAULTS = { operation: 'compress', quality: 75, compressFormat: 'original', convertFormat: 'webp', maxWidth: 1920, maxHeight: 1920, noUpscale: true }
const SUFFIX = { compress: 'compressed', resize: 'resized', convert: '' }

function processBatchItem(file, job, context) {
  switch (job.operation) {
    case 'resize':
      return resizeImage(file, { width: job.maxWidth, height: job.maxHeight, mode: 'fit', noUpscale: job.noUpscale }, context)
    case 'convert':
      return convertImage(file, { format: job.convertFormat, quality: job.quality, background: '#FFFFFF' }, context)
    default:
      return compressImage(file, { quality: job.quality, format: job.compressFormat }, context)
  }
}

function outputNameFor(item) {
  return buildOutputName(item.file.name, SUFFIX[item.job?.operation] ?? '', getImageFormat(item.result.format).ext)
}

function BatchSettings({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <>
      <Tabs
        variant="segmented"
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        aria-label={t('batch.operation')}
        value={settings.operation}
        onChange={(operation) => updateSettings({ operation })}
        tabs={['compress', 'resize', 'convert'].map((id) => ({ value: id, label: t(`batch.operations.${id}`) }))}
      />
      {settings.operation === 'compress' && (
        <SettingsSection title={t('settings.compression')}>
          <QualityControl quality={settings.quality} onChange={(quality) => updateSettings({ quality })} />
          <FormatSelect value={settings.compressFormat} onChange={(compressFormat) => updateSettings({ compressFormat })} formats={COMPRESSIBLE_FORMATS} />
        </SettingsSection>
      )}
      {settings.operation === 'resize' && (
        <SettingsSection title={t('batch.maxSize')} description={t('batch.maxSizeHint')}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label={t('settings.maxWidth')} value={settings.maxWidth} min={1} step={10} onChange={(maxWidth) => updateSettings({ maxWidth })} suffix="px" stepper={false} error={settings.maxWidth > 0 ? undefined : 'validation.widthPositive'} />
            <NumberInput label={t('settings.maxHeight')} value={settings.maxHeight} min={1} step={10} onChange={(maxHeight) => updateSettings({ maxHeight })} suffix="px" stepper={false} error={settings.maxHeight > 0 ? undefined : 'validation.heightPositive'} />
          </div>
          <Checkbox label={t('settings.noUpscale')} checked={settings.noUpscale} onChange={(noUpscale) => updateSettings({ noUpscale })} />
        </SettingsSection>
      )}
      {settings.operation === 'convert' && (
        <SettingsSection title={t('settings.conversion')}>
          <FormatSelect label={t('settings.targetFormat')} value={settings.convertFormat} onChange={(convertFormat) => updateSettings({ convertFormat })} formats={CONVERTIBLE_FORMATS} includeOriginal={false} />
          {getImageFormat(settings.convertFormat).lossy && settings.convertFormat !== 'png' && (
            <Slider label={t('settings.quality')} value={settings.quality} min={1} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
          )}
        </SettingsSection>
      )}
    </>
  )
}

export default function BatchImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [isZipping, setIsZipping] = useState(false)
  const addJob = useRecentJobsStore((state) => state.addJob)
  const queue = useBatchQueue(processBatchItem)
  const { items } = queue

  const summary = useMemo(() => {
    const counts = { total: items.length, completed: 0, failed: 0, active: 0, pending: 0 }
    let before = 0
    let after = 0
    for (const item of items) {
      if (item.status === 'completed') {
        counts.completed += 1
        before += item.file.size
        after += item.result.blob.size
      } else if (item.status === 'failed') counts.failed += 1
      else if (item.status === 'processing' || item.status === 'waiting') counts.active += 1
      else counts.pending += 1
    }
    return { ...counts, before, after }
  }, [items])

  const settingsValid = settings.operation !== 'resize' || (settings.maxWidth > 0 && settings.maxHeight > 0)

  const handleFilesAdded = (files) => {
    const room = BATCH_MAX_FILES - items.length
    if (files.length > room) notify.warning('toasts.batchLimit', { values: { max: BATCH_MAX_FILES } })
    queue.addFiles(files.slice(0, Math.max(0, room)))
  }

  const handleDownloadItem = useCallback((item) => downloadBlob(item.result.blob, outputNameFor(item)), [])
  const { retryItem } = queue
  const handleRetryItem = useCallback((id) => retryItem(id, settings), [retryItem, settings])

  const handleDownloadAll = async () => {
    const completed = items.filter((item) => item.status === 'completed')
    if (completed.length === 1) return handleDownloadItem(completed[0])
    setIsZipping(true)
    try {
      const zip = await createZip(completed.map((item) => ({ name: outputNameFor(item), blob: item.result.blob })))
      downloadBlob(zip, `refract-${settings.operation}-${completed.length}.zip`)
      addJob({ toolId: TOOL_ID, fileName: t('batch.zipName', { count: completed.length }), status: 'completed' })
    } catch (error) {
      notify.error(error)
    } finally {
      setIsZipping(false)
    }
  }

  if (!items.length) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <FileUploader profile={UPLOAD_PROFILES.image} multiple maxFiles={BATCH_MAX_FILES} onFiles={handleFilesAdded} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </ToolLayout>
    )
  }

  const saved = summary.before ? 1 - summary.after / summary.before : 0
  const hasStartable = summary.pending > 0

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          {summary.completed > 0 && (
            <ResultStats
              stats={[
                { label: t('batch.completed'), value: `${summary.completed}/${summary.total}` },
                { label: t('result.before'), value: formatBytes(summary.before) },
                { label: t('result.after'), value: formatBytes(summary.after) },
                { label: saved >= 0 ? t('result.saved') : t('result.larger'), value: formatPercent(Math.abs(saved)), tone: saved > 0 ? 'success' : undefined },
              ]}
            />
          )}
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <p className="text-[13px] font-medium text-text">{t('batch.queueTitle', { count: items.length, max: BATCH_MAX_FILES })}</p>
              <div className="flex items-center gap-1">
                {summary.failed > 0 && (
                  <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => queue.retryFailed(settings)}>
                    {t('batch.retryFailed')}
                  </Button>
                )}
                <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={queue.clear}>
                  {t('batch.clearAll')}
                </Button>
              </div>
            </div>
            <ul className="scrollbar-thin max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <BatchQueueItem key={item.id} item={item} onCancel={queue.cancelItem} onRemove={queue.removeItem} onRetry={handleRetryItem} onDownload={handleDownloadItem} />
              ))}
            </ul>
            {items.length < BATCH_MAX_FILES && (
              <div className="border-t border-border p-3">
                <FileUploader profile={UPLOAD_PROFILES.image} multiple maxFiles={BATCH_MAX_FILES - items.length} onFiles={handleFilesAdded} variant="compact" title={t('batch.addMore')} />
              </div>
            )}
          </div>
        </div>
        <SettingsPanel
          footer={
            <>
              <Button variant="primary" size="lg" fullWidth leftIcon={Play} onClick={() => queue.startAll(settings)} disabled={!hasStartable || !settingsValid} loading={summary.active > 0 && !hasStartable}>
                {summary.active > 0 && !hasStartable ? t('batch.processing') : t('batch.start', { count: summary.pending })}
              </Button>
              <Button variant="secondary" fullWidth leftIcon={FileArchive} onClick={handleDownloadAll} disabled={!summary.completed} loading={isZipping}>
                {summary.completed > 1 ? t('batch.downloadAllZip', { count: summary.completed }) : t('batch.downloadAll')}
              </Button>
            </>
          }
        >
          <BatchSettings settings={settings} updateSettings={updateSettings} />
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Info size={13} aria-hidden="true" />
            {t('batch.settingsApplyHint')}
          </p>
          <PrivacyNote />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
