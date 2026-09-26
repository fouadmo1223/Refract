import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/lib/format'
import { loopVideo } from '@/services/video/videoEffectsService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { NumberInput } from '@/components/ui/NumberInput'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-loop'
const DEFAULTS = { loops: 3 }
const isValidLoops = (value) => Number.isInteger(value) && value >= 2 && value <= 50

export default function LoopVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const valid = isValidLoops(settings.loops)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-loop.action')}
        actionIcon={Repeat2}
        processingTitle={t('processing.loopingVideo')}
        successMessage="toasts.videoLooped"
        canProcess={valid}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('loop.title')}>
              <NumberInput label={t('loop.count')} value={settings.loops} min={2} max={50} onChange={(loops) => updateSettings({ loops })} suffix="×" error={valid ? undefined : 'validation.loopCountRange'} />
              {valid && meta?.duration && (
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                  {t('speed.newDuration')}: <span className="font-semibold text-text">{formatDuration(meta.duration * settings.loops)}</span>
                </p>
              )}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => loopVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.loopComplete')} suffix={`loop-${settings.loops}x`} showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
