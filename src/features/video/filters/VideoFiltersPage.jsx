import { Palette, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { VIDEO_ADJUSTMENTS, VIDEO_LOOKS, VIDEO_LOOK_PREVIEW, applyVideoFilters } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-filters'
const ADJUSTMENT_KEYS = Object.keys(VIDEO_ADJUSTMENTS)
const ZERO = Object.fromEntries(ADJUSTMENT_KEYS.map((key) => [key, 0]))
const DEFAULTS = { look: 'vivid', ...ZERO }
const GROUPS = {
  color: ['brightness', 'contrast', 'saturation', 'temperature', 'hue'],
  detail: ['sharpen', 'blur', 'vignette', 'grain'],
}
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** CSS approximation for the live preview — the export is rendered by FFmpeg. */
function previewFilter(s) {
  const hue = s.hue + (s.temperature < 0 ? (s.temperature / 100) * 15 : 0)
  return [
    VIDEO_LOOK_PREVIEW[s.look] ?? '',
    `brightness(${1 + (s.brightness / 100) * 0.3}) contrast(${1 + (s.contrast / 100) * 0.6}) saturate(${Math.max(0, 1 + s.saturation / 100)})`,
    s.temperature > 0 ? `sepia(${(s.temperature / 100) * 0.35})` : '',
    hue ? `hue-rotate(${hue}deg)` : '',
    s.blur > 0 ? `blur(${((s.blur / 100) * 6).toFixed(1)}px)` : '',
    s.sharpen > 0 ? `contrast(${1 + (s.sharpen / 100) * 0.08})` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function FilterPreview({ file, meta, settings }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  if (meta?.playable === false) return <VideoPreview file={file} meta={meta} />
  return (
    <div className="flex flex-col gap-2">
      <MediaStage className="bg-black p-0 sm:p-0">
        <div className="relative overflow-hidden">
          {url && <video src={url} className="block max-h-[62vh] w-full object-contain" style={{ filter: previewFilter(settings) }} muted loop autoPlay playsInline controls />}
          {settings.vignette > 0 && (
            <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent ${70 - settings.vignette * 0.35}%, rgba(0,0,0,${0.35 + settings.vignette * 0.005}) 100%)` }} />
          )}
          {settings.grain > 0 && <div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ opacity: settings.grain / 100, backgroundImage: GRAIN_TEXTURE }} />}
        </div>
      </MediaStage>
      <p className="text-xs text-muted">{t('filters.previewNote')}</p>
    </div>
  )
}

function AdjustmentGroup({ title, keys, settings, updateSettings }) {
  const { t } = useTranslation()
  const changed = keys.some((key) => settings[key])
  return (
    <SettingsSection
      title={title}
      action={
        changed && (
          <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => updateSettings(Object.fromEntries(keys.map((key) => [key, 0])))}>
            {t('common.reset')}
          </Button>
        )
      }
    >
      {keys.map((key) => {
        const [min, max] = VIDEO_ADJUSTMENTS[key]
        return (
          <Slider
            key={key}
            label={t(`filters.adjustments.${key}`)}
            value={settings[key]}
            min={min}
            max={max}
            origin={min < 0 ? 0 : undefined}
            onChange={(value) => updateSettings({ [key]: value })}
            onDoubleClick={() => updateSettings({ [key]: 0 })}
            formatValue={(value) => `${min < 0 && value > 0 ? '+' : ''}${value}${key === 'hue' ? '°' : ''}`}
          />
        )
      })}
    </SettingsSection>
  )
}

export default function VideoFiltersPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const unchanged = settings.look === 'none' && ADJUSTMENT_KEYS.every((key) => !settings[key])

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-filters.action')}
        actionIcon={Palette}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={!unchanged}
        renderPreview={({ file, meta }) => <FilterPreview file={file} meta={meta} settings={settings} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('filters.look')}>
              <SegmentedControl wrap value={settings.look} onChange={(look) => updateSettings({ look })} options={Object.keys(VIDEO_LOOKS).map((id) => ({ value: id, label: t(`filters.presets.${id}`) }))} />
            </SettingsSection>
            <AdjustmentGroup title={t('filters.groups.color')} keys={GROUPS.color} settings={settings} updateSettings={updateSettings} />
            <AdjustmentGroup title={t('filters.groups.detail')} keys={GROUPS.detail} settings={settings} updateSettings={updateSettings} />
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => applyVideoFilters(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix={settings.look === 'none' ? 'adjusted' : settings.look} showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
