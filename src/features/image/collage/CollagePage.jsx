import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, LayoutGrid, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { getImageFormat } from '@/constants/imageFormats'
import { createFileId } from '@/lib/files'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { DEFAULT_COLLAGE, createCollage, drawCollage } from '@/services/image/collageService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { ResultView } from '@/components/media/ResultView'
import { ErrorState } from '@/components/feedback/States'

const TOOL_ID = 'image-collage'
const MAX_IMAGES = 9
const PREVIEW_WIDTH = 900

function Thumb({ item, index, count, onMove, onRemove }) {
  const { t } = useTranslation()
  const url = useObjectUrl(item.file)
  return (
    <li className="flex items-center gap-2.5 px-2.5 py-2">
      <span className="tabular w-4 text-xs font-semibold text-muted">{index + 1}</span>
      <div className="size-9 shrink-0 overflow-hidden rounded-sm bg-surface-2">{url && <img src={url} alt="" className="size-full object-cover" />}</div>
      <p className="min-w-0 flex-1 truncate text-[13px] text-text" dir="auto">
        {item.file.name}
      </p>
      <IconButton icon={ArrowUp} label={t('merge.moveUp')} size="xs" disabled={index === 0} onClick={() => onMove(index, -1)} />
      <IconButton icon={ArrowDown} label={t('merge.moveDown')} size="xs" disabled={index === count - 1} onClick={() => onMove(index, 1)} />
      <IconButton icon={X} label={t('common.removeFile')} size="xs" variant="danger-ghost" onClick={() => onRemove(item.id)} />
    </li>
  )
}

/** Downscaled bitmaps for the live preview (closed when the list changes). */
function usePreviewBitmaps(items) {
  const [bitmaps, setBitmaps] = useState([])
  useEffect(() => {
    let cancelled = false
    const created = []
    Promise.all(items.map((item) => createImageBitmap(item.file, { resizeWidth: 480, resizeQuality: 'medium' }).catch(() => null))).then((list) => {
      created.push(...list.filter(Boolean))
      if (cancelled) created.forEach((bitmap) => bitmap.close())
      else setBitmaps(list.filter(Boolean))
    })
    return () => {
      cancelled = true
      created.forEach((bitmap) => bitmap.close())
    }
  }, [items])
  return bitmaps
}

export default function CollagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULT_COLLAGE)
  const [items, setItems] = useState([])
  const bitmaps = usePreviewBitmaps(items)
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.collageCreated' })

  const addFiles = (files) => setItems((current) => [...current, ...files.map((file) => ({ id: createFileId(file), file }))].slice(0, MAX_IMAGES))
  const moveItem = (index, direction) =>
    setItems((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(index + direction, 0, item)
      return next
    })
  const handleCreate = () => job.run(({ onProgress }) => createCollage(items.map((item) => item.file), settings, { onProgress }), { fileName: t('collage.fileName', { count: items.length }) })

  if (job.status === 'success' && job.result) {
    const format = getImageFormat(job.result.format)
    return (
      <ToolLayout toolId={TOOL_ID}>
        <CollageResult result={job.result} format={format} onAdjust={job.reset} onStartOver={() => { job.reset(); setItems([]) }} />
      </ToolLayout>
    )
  }

  if (!items.length) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <FileUploader profile={UPLOAD_PROFILES.image} multiple maxFiles={MAX_IMAGES} onFiles={addFiles} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          {job.isProcessing ? (
            <MediaStage>
              <ProcessingState title={t('processing.creatingCollage')} progress={job.progress} stage={job.stage} onCancel={job.cancel} />
            </MediaStage>
          ) : job.status === 'error' ? (
            <MediaStage>
              <ErrorState error={job.error} onRetry={handleCreate} />
            </MediaStage>
          ) : (
            <MediaStage checkerboard>
              {bitmaps.length > 0 && <CanvasView className="h-auto max-h-[62vh] w-auto max-w-full" deps={[bitmaps, settings]} draw={() => drawCollage(bitmaps, settings, PREVIEW_WIDTH)} label={t('common.preview')} />}
            </MediaStage>
          )}
          <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {items.map((item, index) => (
              <Thumb key={item.id} item={item} index={index} count={items.length} onMove={moveItem} onRemove={(id) => setItems((current) => current.filter((entry) => entry.id !== id))} />
            ))}
          </ol>
          {items.length < MAX_IMAGES && <FileUploader profile={UPLOAD_PROFILES.image} multiple maxFiles={MAX_IMAGES - items.length} onFiles={addFiles} variant="compact" title={t('collage.addMore')} />}
        </div>
        <SettingsPanel
          footer={
            <Button variant="primary" size="lg" fullWidth leftIcon={LayoutGrid} onClick={handleCreate} disabled={items.length < 2} loading={job.isProcessing}>
              {t('tools.image-collage.action')}
            </Button>
          }
        >
          <SettingsSection title={t('collage.layout')}>
            {items.length < 2 && <p className="text-xs font-medium text-danger">{t('validation.collageMinImages')}</p>}
            <SegmentedControl
              label={t('collage.columns')}
              value={settings.columns}
              onChange={(columns) => updateSettings({ columns })}
              options={['auto', 1, 2, 3, 4].map((value) => ({ value, label: value === 'auto' ? t('collage.auto') : String(value) }))}
            />
            <SegmentedControl label={t('collage.cellShape')} wrap value={settings.cellAspect} onChange={(cellAspect) => updateSettings({ cellAspect })} options={['1:1', '4:5', '3:2', '16:9', '9:16'].map((value) => ({ value, label: value }))} />
            <Slider label={t('collage.gap')} value={settings.gap} min={0} max={6} step={0.5} onChange={(gap) => updateSettings({ gap })} formatValue={(value) => `${value}%`} />
            <Slider label={t('border.radius')} value={settings.radius} min={0} max={8} step={0.5} onChange={(radius) => updateSettings({ radius })} formatValue={(value) => `${value}%`} />
            <ColorInput label={t('settings.backgroundColor')} value={settings.background} onChange={(background) => updateSettings({ background })} />
          </SettingsSection>
          <SettingsSection title={t('settings.output')}>
            <Select label={t('settings.width')} value={settings.width} onChange={(width) => updateSettings({ width })} options={[1080, 2048, 3000, 4096].map((value) => ({ value, label: `${value}px` }))} />
            <SegmentedControl
              value={settings.format}
              onChange={(format) => updateSettings({ format })}
              options={[
                { value: 'jpeg', label: 'JPG' },
                { value: 'png', label: 'PNG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
          </SettingsSection>
          <PrivacyNote />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}

function CollageResult({ result, format, onAdjust, onStartOver }) {
  const { t } = useTranslation()
  const url = useObjectUrl(result.blob)
  return (
    <ResultView
      title={t('result.collageComplete')}
      onAdjust={onAdjust}
      onProcessAnother={onStartOver}
      preview={<MediaStage checkerboard>{url && <img src={url} alt={t('result.result')} className="max-h-[62vh] max-w-full object-contain" />}</MediaStage>}
      exportProps={{ blob: result.blob, fileName: `collage.${format.ext}`, extension: format.ext, formatLabel: format.label, width: result.width, height: result.height }}
    />
  )
}
