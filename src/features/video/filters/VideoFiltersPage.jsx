import { Palette, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { VIDEO_LOOKS, VIDEO_LOOK_PREVIEW, applyVideoFilters } from '@/services/video/videoLookService'
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
const DEFAULTS = { look: 'vivid', brightness: 0, contrast: 0, saturation: 0 }

/** CSS approximation for the live preview — the export is rendered by FFmpeg. */
function previewFilter(settings) {
  const manual = `brightness(${1 + (settings.brightness / 100) * 0.3}) contrast(${1 + (settings.contrast / 100) * 0.6}) saturate(${Math.max(0, 1 + settings.saturation / 100)})`
  return `${VIDEO_LOOK_PREVIEW[settings.look] ?? ''} ${manual}`.trim()
}

function FilterPreview({ file, meta, settings }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  if (meta?.playable === false) return <VideoPreview file={file} meta={meta} />
  return (
    <div className="flex flex-col gap-2">
      <MediaStage className="bg-black p-0 sm:p-0">
        {url && <video src={url} className="max-h-[62vh] w-full object-contain" style={{ filter: previewFilter(settings) }} muted loop autoPlay playsInline controls />}
      </MediaStage>
      <p className="text-xs text-muted">{t('filters.previewNote')}</p>
    </div>
  )
}

export default function VideoFiltersPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const unchanged = settings.look === 'none' && !settings.brightness && !settings.contrast && !settings.saturation

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
            <SettingsSection
              title={t('filters.adjust')}
              action={
                <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => updateSettings({ brightness: 0, contrast: 0, saturation: 0 })}>
                  {t('common.reset')}
                </Button>
              }
            >
              {['brightness', 'contrast', 'saturation'].map((key) => (
                <Slider
                  key={key}
                  label={t(`editor.adjustments.${key}`)}
                  value={settings[key]}
                  min={-100}
                  max={100}
                  origin={0}
                  onChange={(value) => updateSettings({ [key]: value })}
                  onDoubleClick={() => updateSettings({ [key]: 0 })}
                  formatValue={(value) => (value > 0 ? `+${value}` : String(value))}
                />
              ))}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => applyVideoFilters(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix={settings.look === 'none' ? 'adjusted' : settings.look} showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
