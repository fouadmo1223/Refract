import { useState } from 'react'
import { Frame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { resultFileName } from '@/lib/files'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { toCanvas } from '@/services/image/canvas'
import { DEFAULT_BORDER, addBorder } from '@/services/image/compositionEffects'
import { readImageInfo } from '@/services/image/imageInfoService'
import { runImageJob } from '@/services/image/imageWorkerClient'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-border'
const DEFAULTS = { ...DEFAULT_BORDER, format: 'png' }

export default function BorderImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 1200)
  const needsAlpha = settings.transparentBackground || settings.radius > 0

  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings }) => {
    const needsAlpha = settings.transparentBackground || settings.radius > 0
    return (
      <>
        <SettingsSection title={t('border.frame')}>
          <Slider label={t('border.padding')} value={settings.padding} min={0} max={30} onChange={(padding) => updateSettings({ padding })} formatValue={(value) => `${value}%`} />
          <Slider label={t('border.radius')} value={settings.radius} min={0} max={25} onChange={(radius) => updateSettings({ radius })} formatValue={(value) => `${value}%`} />
          <Switch label={t('border.shadow')} checked={settings.shadow} onChange={(shadow) => updateSettings({ shadow })} />
          <Switch label={t('border.transparent')} checked={settings.transparentBackground} onChange={(transparentBackground) => updateSettings({ transparentBackground })} />
          {!settings.transparentBackground && <ColorInput label={t('settings.backgroundColor')} value={settings.color} onChange={(color) => updateSettings({ color })} />}
        </SettingsSection>
        <SettingsSection title={t('settings.output')}>
          <SegmentedControl
            value={settings.format}
            onChange={(format) => updateSettings({ format })}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'webp', label: 'WebP' },
              { value: 'jpeg', label: 'JPG', disabled: needsAlpha },
            ]}
          />
          {needsAlpha && <p className="-mt-1 text-xs text-muted">{t('border.alphaHint')}</p>}
        </SettingsSection>
      </>
    )
  }
  const runJob = ({ settings, file: source, signal, onProgress }) => {
    const needsAlpha = settings.transparentBackground || settings.radius > 0
    return runImageJob('border', source, { ...settings, format: needsAlpha && settings.format === 'jpeg' ? 'png' : settings.format, quality: 92 }, { signal, onProgress })
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-border.action')}
        actionIcon={Frame}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        renderPreview={() =>
          bitmap ? (
            <MediaStage checkerboard>
              <CanvasView className="h-auto max-h-[62vh] w-auto max-w-full" deps={[bitmap, settings]} draw={() => addBorder(toCanvas(bitmap), settings)} label={t('common.preview')} />
            </MediaStage>
          ) : (
            <MediaStage>
              <LoadingState />
            </MediaStage>
          )
        }
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result) => resultFileName(file.name, 'framed', result?.format),
        }}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix="framed" compare={false} />}
      />
    </ToolLayout>
  )
}
