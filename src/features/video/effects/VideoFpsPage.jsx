import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resultFileName } from '@/lib/files'
import { changeVideoFps } from '@/services/video/videoTransformService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-fps'
const DEFAULTS = { fps: 30, method: 'drop' }
const PRESETS = [15, 24, 25, 30, 50, 60]
const isValidFps = (value) => Number.isFinite(value) && value >= 1 && value <= 120

export default function VideoFpsPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const valid = isValidFps(settings.fps)
  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings, file, meta }) => {
    const valid = isValidFps(settings.fps)
    return (
      <>
        <VideoInfo file={file} meta={meta} />
        <SettingsSection title={t('fps.title')}>
          <SegmentedControl
            wrap
            value={PRESETS.includes(settings.fps) ? settings.fps : null}
            onChange={(fps) => updateSettings({ fps })}
            options={PRESETS.map((fps) => ({ value: fps, label: String(fps) }))}
          />
          <NumberInput label={t('fps.custom')} value={settings.fps} min={1} max={120} precision={2} onChange={(fps) => updateSettings({ fps })} suffix="fps" error={valid ? undefined : 'validation.fpsRange'} />
          <p className="text-xs text-muted">{t('fps.hint')}</p>
          <SegmentedControl
            label={t('fps.method')}
            value={settings.method}
            onChange={(method) => updateSettings({ method })}
            options={['drop', 'blend', 'motion'].map((value) => ({ value, label: t(`fps.methods.${value}`) }))}
          />
          <p className="-mt-1 text-xs text-muted">{t(`fps.methodHints.${settings.method}`)}</p>
        </SettingsSection>
      </>
    )
  }
  const runJob = ({ settings, file, meta, signal, onProgress }) => changeVideoFps(file, settings, meta, { signal, onProgress })

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-fps.action')}
        actionIcon={Timer}
        processingTitle={t('processing.changingFps')}
        successMessage="toasts.fpsChanged"
        canProcess={valid}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result, fileSettings) => resultFileName(file.name, `${fileSettings.fps}fps`, result?.format),
        }}
        renderResult={(context) => <VideoResult {...context} title={t('result.fpsComplete')} suffix={`${settings.fps}fps`} />}
      />
    </ToolLayout>
  )
}
