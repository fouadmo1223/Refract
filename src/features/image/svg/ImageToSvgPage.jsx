import { PenTool } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { readImageInfo } from '@/services/image/imageInfoService'
import { TRACE_PRESETS, traceImageToSvg } from '@/services/image/traceService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'png-to-svg'
const DEFAULTS = { preset: 'logo', colors: 8, detail: 'medium', removeBackground: false }

export default function ImageToSvgPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.png-to-svg.action')}
        actionIcon={PenTool}
        processingTitle={t('processing.tracing')}
        successMessage="toasts.vectorized"
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={() => (
          <SettingsSection title={t('trace.title')}>
            <SegmentedControl
              wrap
              label={t('trace.style')}
              value={settings.preset}
              onChange={(preset) => updateSettings({ preset, colors: TRACE_PRESETS[preset].numberofcolors })}
              options={Object.keys(TRACE_PRESETS).map((id) => ({ value: id, label: t(`trace.presets.${id}`) }))}
            />
            <p className="-mt-1 text-xs text-muted">{t(`trace.presets.${settings.preset}Hint`)}</p>
            {settings.preset !== 'lineart' && (
              <Slider label={t('trace.colors')} value={settings.colors} min={2} max={64} onChange={(colors) => updateSettings({ colors })} />
            )}
            <SegmentedControl
              label={t('trace.detail')}
              value={settings.detail}
              onChange={(detail) => updateSettings({ detail })}
              options={['low', 'medium', 'high'].map((id) => ({ value: id, label: t(`trace.details.${id}`) }))}
            />
            <Switch label={t('trace.removeBackground')} description={t('trace.removeBackgroundHint')} checked={settings.removeBackground} onChange={(removeBackground) => updateSettings({ removeBackground })} />
          </SettingsSection>
        )}
        onProcess={({ file, signal, onProgress }) => traceImageToSvg(file, settings, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.vectorComplete')} suffix="" compare hideSavings />}
      />
    </ToolLayout>
  )
}
