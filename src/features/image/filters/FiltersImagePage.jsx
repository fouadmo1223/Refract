import { useMemo, useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { resampleCanvas, toCanvas } from '@/services/image/canvas'
import { applyFilterPreset } from '@/services/image/compositionEffects'
import { FILTER_IDS } from '@/services/image/filterPresets'
import { readImageInfo } from '@/services/image/imageInfoService'
import { runImageJob } from '@/services/image/imageWorkerClient'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-filters'
const DEFAULTS = { preset: 'vivid', intensity: 100, tune: {} }
const TUNE_KEYS = [
  { key: 'brightness', min: -100, max: 100 },
  { key: 'contrast', min: -100, max: 100 },
  { key: 'saturation', min: -100, max: 100 },
  { key: 'temperature', min: -100, max: 100 },
  { key: 'tint', min: -100, max: 100 },
  { key: 'sharpen', min: 0, max: 100 },
  { key: 'vignette', min: 0, max: 100 },
]
const hasTune = (tune) => Object.values(tune ?? {}).some(Boolean)
const THUMB_SIZE = 96

/** Grid of live thumbnails — each shows the actual image with that look. */
function FilterGrid({ bitmap, value, onChange }) {
  const { t } = useTranslation()
  const thumbnails = useMemo(() => {
    if (!bitmap) return {}
    const scale = THUMB_SIZE / Math.min(bitmap.width, bitmap.height)
    const small = resampleCanvas(toCanvas(bitmap), Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    return Object.fromEntries(
      FILTER_IDS.map((id) => {
        const canvas = applyFilterPreset(small, { preset: id, intensity: 100 })
        const element = document.createElement('canvas')
        element.width = canvas.width
        element.height = canvas.height
        element.getContext('2d').drawImage(canvas, 0, 0)
        return [id, element.toDataURL('image/jpeg', 0.8)]
      }),
    )
  }, [bitmap])

  return (
    <div role="radiogroup" aria-label={t('filters.look')} className="grid grid-cols-3 gap-2">
      {FILTER_IDS.map((id) => {
        const checked = id === value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(id)}
            className={cn('overflow-hidden rounded-md text-start outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-primary', checked ? 'ring-2 ring-primary' : 'ring-1 ring-border hover:ring-border-strong')}
          >
            <div className="aspect-square bg-surface-2">{thumbnails[id] && <img src={thumbnails[id]} alt="" className="size-full object-cover" />}</div>
            <span className={cn('block truncate px-1.5 py-1 text-2xs font-medium', checked ? 'text-primary-soft-fg' : 'text-text-2')}>{t(`filters.presets.${id}`)}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function FiltersImagePage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const setTune = (key, value) => updateSettings({ tune: { ...settings.tune, [key]: value } })
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 1200)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-filters.action')}
        actionIcon={Palette}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={settings.preset !== 'none' || hasTune(settings.tune)}
        renderPreview={() =>
          bitmap ? (
            <MediaStage checkerboard>
              <CanvasView className="h-auto max-h-[62vh] w-auto max-w-full" deps={[bitmap, settings]} draw={() => applyFilterPreset(toCanvas(bitmap), settings)} label={t('common.preview')} />
            </MediaStage>
          ) : (
            <MediaStage>
              <LoadingState />
            </MediaStage>
          )
        }
        renderSettings={() => (
          <>
            <SettingsSection title={t('filters.look')}>
              <FilterGrid bitmap={bitmap} value={settings.preset} onChange={(preset) => updateSettings({ preset })} />
              <Slider label={t('effects.intensity')} value={settings.intensity} min={0} max={100} onChange={(intensity) => updateSettings({ intensity })} formatValue={(value) => `${value}%`} />
            </SettingsSection>
            <SettingsSection
              title={t('filters.fineTune')}
              description={t('filters.fineTuneHint')}
              action={
                hasTune(settings.tune) && (
                  <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => updateSettings({ tune: {} })}>
                    {t('common.reset')}
                  </Button>
                )
              }
            >
              {TUNE_KEYS.map(({ key, min, max }) => (
                <Slider
                  key={key}
                  label={key === 'vignette' ? t('filters.vignette') : t(`editor.adjustments.${key}`)}
                  value={settings.tune[key] ?? 0}
                  min={min}
                  max={max}
                  origin={min < 0 ? 0 : undefined}
                  onChange={(value) => setTune(key, value)}
                  onDoubleClick={() => setTune(key, 0)}
                  formatValue={(value) => (min < 0 && value > 0 ? `+${value}` : String(value))}
                />
              ))}
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source, signal, onProgress }) => runImageJob('filter', source, { ...settings, format: 'original', quality: 92 }, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix={settings.preset === 'none' ? 'edited' : settings.preset} />}
      />
    </ToolLayout>
  )
}
