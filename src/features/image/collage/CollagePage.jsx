import { useEffect, useRef, useState } from 'react'
import { Crosshair, ImagePlus, ImageUp, LayoutGrid, MousePointerClick, MoveHorizontal, RotateCcw, Shuffle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES, getAcceptString } from '@/constants/fileConstraints'
import { getImageFormat } from '@/constants/imageFormats'
import { createFileId, validateFile } from '@/lib/files'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { notify } from '@/lib/notify'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { useHotkey } from '@/hooks/useHotkey'
import {
  CANVAS_ASPECTS,
  DEFAULT_COLLAGE,
  DEFAULT_PHOTO_TRANSFORM,
  createCollage,
  createPhotoPreview,
  equalWeights,
  getLayoutKey,
  getRowCounts,
  resolveCanvasAspect,
} from '@/services/image/collageService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { ResultView } from '@/components/media/ResultView'
import { ErrorState } from '@/components/feedback/States'
import { CollageEditor } from './CollageEditor'

const TOOL_ID = 'image-collage'
const MAX_IMAGES = 9
const BACKGROUND_SWATCHES = ['#FFFFFF', '#F4EFE6', '#111111', '#1E293B', '#EA580C', '#0EA5E9']

const createItem = (file) => ({ id: createFileId(file), file, ...DEFAULT_PHOTO_TRANSFORM })

/** Downscaled preview (object URL + original size) per item; regenerated only when its file changes. */
function usePhotoPreviews(items) {
  const cacheRef = useRef(new Map())
  const [previews, setPreviews] = useState({})

  useEffect(() => {
    const cache = cacheRef.current
    const ids = new Set(items.map((item) => item.id))
    for (const [id, entry] of cache) {
      if (!ids.has(id) || items.find((item) => item.id === id)?.file !== entry.file) {
        entry.cancelled = true
        if (entry.preview) URL.revokeObjectURL(entry.preview.url)
        cache.delete(id)
      }
    }
    for (const item of items) {
      if (cache.has(item.id)) continue
      const entry = { file: item.file, preview: null, cancelled: false }
      cache.set(item.id, entry)
      createPhotoPreview(item.file)
        .then((preview) => {
          if (entry.cancelled) return URL.revokeObjectURL(preview.url)
          entry.preview = preview
          setPreviews((current) => ({ ...current, [item.id]: preview }))
        })
        .catch((error) => notify.error(error))
    }
    setPreviews((current) => Object.fromEntries(Object.entries(current).filter(([id]) => cache.get(id)?.preview === current[id])))
  }, [items])

  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      for (const entry of cache.values()) {
        entry.cancelled = true
        if (entry.preview) URL.revokeObjectURL(entry.preview.url)
      }
      cache.clear()
    }
  }, [])

  return previews
}

function validateImages(fileList, max) {
  const files = [...(fileList ?? [])]
  if (files.length > max) notify.error(new AppError(ERROR_CODES.TOO_MANY_FILES, { max }))
  const valid = []
  for (const file of files.slice(0, Math.max(0, max))) {
    try {
      valid.push(validateFile(file, UPLOAD_PROFILES.image))
    } catch (error) {
      notify.error(error)
    }
  }
  return valid
}

function Hint({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={13} className="shrink-0 text-faint" aria-hidden="true" />
      {children}
    </span>
  )
}

export default function CollagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULT_COLLAGE)
  const [items, setItems] = useState([])
  const [weights, setWeights] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const previews = usePhotoPreviews(items)
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.collageCreated' })
  const pickerRef = useRef(null)
  const replaceTargetRef = useRef(null)

  const rowCounts = getRowCounts(items.length, settings.columns)
  const hasCustomLayout = weights?.key === getLayoutKey(rowCounts) && JSON.stringify(weights) !== JSON.stringify(equalWeights(rowCounts))
  const aspect = resolveCanvasAspect(settings, items.length)
  const selected = items.find((item) => item.id === selectedId)
  const selectedIndex = items.indexOf(selected)
  const outputHeight = Math.round(settings.width / aspect)

  useHotkey('escape', () => setSelectedId(null), { enabled: Boolean(selectedId) })

  const updateItem = (id, patch) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  const addFiles = (files) => setItems((current) => [...current, ...files.map(createItem)].slice(0, MAX_IMAGES))
  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }
  const swapItems = (fromId, toId) =>
    setItems((current) => {
      const next = [...current]
      const from = next.findIndex((item) => item.id === fromId)
      const to = next.findIndex((item) => item.id === toId)
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  const shuffle = () =>
    setItems((current) => {
      const next = [...current]
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[j]] = [next[j], next[i]]
      }
      return next
    })
  const replaceItem = (id, fileList) => {
    if (!fileList) {
      replaceTargetRef.current = id
      pickerRef.current?.click()
      return
    }
    const [file] = validateImages(fileList, 1)
    if (file) updateItem(id, { file, ...DEFAULT_PHOTO_TRANSFORM })
  }
  const handlePicked = (fileList) => {
    const target = replaceTargetRef.current
    replaceTargetRef.current = null
    if (target) replaceItem(target, fileList)
    else addFiles(validateImages(fileList, MAX_IMAGES - items.length))
  }

  const handleCreate = () =>
    job.run(({ onProgress }) => createCollage(items, settings, weights, { onProgress }), { fileName: t('collage.fileName', { count: items.length }) })

  const hiddenPicker = (
    <input
      ref={pickerRef}
      type="file"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      accept={getAcceptString(UPLOAD_PROFILES.image.types)}
      multiple
      onChange={(event) => {
        handlePicked(event.target.files)
        event.target.value = ''
      }}
    />
  )

  if (job.status === 'success' && job.result) {
    const format = getImageFormat(job.result.format)
    return (
      <ToolLayout toolId={TOOL_ID}>
        <CollageResult
          result={job.result}
          format={format}
          onAdjust={job.reset}
          onStartOver={() => {
            job.reset()
            setItems([])
            setWeights(null)
          }}
        />
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
      {hiddenPicker}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
          {job.isProcessing ? (
            <MediaStage>
              <ProcessingState title={t('processing.creatingCollage')} progress={job.progress} stage={job.stage} onCancel={job.cancel} />
            </MediaStage>
          ) : job.status === 'error' ? (
            <MediaStage>
              <ErrorState error={job.error} onRetry={handleCreate} />
            </MediaStage>
          ) : (
            <MediaStage checkerboard className="p-4 sm:p-8">
              <CollageEditor
                items={items}
                previews={previews}
                settings={settings}
                aspect={aspect}
                weights={weights}
                onWeightsChange={setWeights}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onSwap={swapItems}
                onPan={(id, patch) => patch && updateItem(id, patch)}
                onReplace={replaceItem}
                onRemove={removeItem}
                onDropFiles={(files) => addFiles(validateImages(files, MAX_IMAGES - items.length))}
              />
            </MediaStage>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <span className="tabular text-[13px] font-medium text-text">{t('collage.photoCount', { count: items.length, max: MAX_IMAGES })}</span>
            <span className="flex-1" />
            <Button variant="ghost" size="sm" leftIcon={Shuffle} onClick={shuffle} disabled={items.length < 2 || job.isProcessing}>
              {t('collage.shuffle')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={ImagePlus} onClick={() => pickerRef.current?.click()} disabled={items.length >= MAX_IMAGES || job.isProcessing}>
              {t('collage.addPhotos')}
            </Button>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
            <Hint icon={LayoutGrid}>{t('collage.hints.swap')}</Hint>
            <Hint icon={MoveHorizontal}>{t('collage.hints.resize')}</Hint>
            <Hint icon={MousePointerClick}>{t('collage.hints.select')}</Hint>
          </p>
        </div>

        <SettingsPanel
          footer={
            <Button variant="primary" size="lg" fullWidth leftIcon={LayoutGrid} onClick={handleCreate} disabled={items.length < 2} loading={job.isProcessing}>
              {t('tools.image-collage.action')}
            </Button>
          }
        >
          {selected && (
            <SettingsSection
              title={t('collage.selectedPhoto', { index: selectedIndex + 1 })}
              action={
                <Button variant="ghost" size="xs" onClick={() => setSelectedId(null)}>
                  {t('collage.done')}
                </Button>
              }
              className="rounded-lg border border-primary/40 bg-primary-soft/40 p-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-2">{previews[selected.id] && <img src={previews[selected.id].url} alt="" className="size-full object-cover" />}</div>
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-text" dir="auto">
                  {selected.file.name}
                </p>
              </div>
              <Slider
                label={t('collage.zoom')}
                value={Math.round(selected.zoom * 100)}
                min={100}
                max={300}
                step={5}
                formatValue={(value) => `${value}%`}
                onChange={(value) => updateItem(selected.id, { zoom: value / 100 })}
                onDoubleClick={() => updateItem(selected.id, { zoom: 1 })}
              />
              <div className="grid grid-cols-3 gap-1.5">
                <Button variant="secondary" size="xs" leftIcon={Crosshair} onClick={() => updateItem(selected.id, DEFAULT_PHOTO_TRANSFORM)} disabled={selected.zoom === 1 && selected.focusX === 0.5 && selected.focusY === 0.5}>
                  {t('collage.recenter')}
                </Button>
                <Button variant="secondary" size="xs" leftIcon={ImageUp} onClick={() => replaceItem(selected.id)}>
                  {t('collage.replace')}
                </Button>
                <Button variant="secondary" size="xs" leftIcon={Trash2} onClick={() => removeItem(selected.id)} className="hover:text-danger">
                  {t('common.remove')}
                </Button>
              </div>
            </SettingsSection>
          )}

          <SettingsSection
            title={t('collage.layout')}
            action={
              hasCustomLayout && (
                <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => setWeights(null)}>
                  {t('collage.evenOut')}
                </Button>
              )
            }
          >
            {items.length < 2 && <p className="text-xs font-medium text-danger">{t('validation.collageMinImages')}</p>}
            <SegmentedControl
              label={t('collage.columns')}
              value={settings.columns}
              onChange={(columns) => updateSettings({ columns })}
              options={['auto', 1, 2, 3, 4].map((value) => ({ value, label: value === 'auto' ? t('collage.auto') : String(value) }))}
            />
            <SegmentedControl
              label={t('collage.canvas')}
              wrap
              value={settings.canvasAspect ?? 'auto'}
              onChange={(canvasAspect) => updateSettings({ canvasAspect })}
              options={['auto', ...Object.keys(CANVAS_ASPECTS)].map((value) => ({ value, label: value === 'auto' ? t('collage.auto') : value }))}
            />
          </SettingsSection>

          <SettingsSection title={t('collage.style')}>
            <Slider label={t('collage.gap')} value={settings.gap} min={0} max={6} step={0.25} onChange={(gap) => updateSettings({ gap })} formatValue={(value) => `${value}%`} />
            <Slider label={t('border.radius')} value={settings.radius} min={0} max={10} step={0.25} onChange={(radius) => updateSettings({ radius })} formatValue={(value) => `${value}%`} />
            <div className="flex flex-col gap-2">
              <ColorInput label={t('settings.backgroundColor')} value={settings.background} onChange={(background) => updateSettings({ background })} />
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    title={color}
                    aria-pressed={settings.background.toUpperCase() === color}
                    onClick={() => updateSettings({ background: color })}
                    className="size-6 rounded-full border border-border-strong outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
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
            <p className="tabular -mt-1 text-xs text-muted" dir="ltr">
              {settings.width} × {outputHeight} px
            </p>
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
