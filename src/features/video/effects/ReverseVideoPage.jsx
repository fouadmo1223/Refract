import { useState } from 'react'
import { Rewind, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REVERSE_RECOMMENDED_MAX_SECONDS, reverseVideo } from '@/services/video/videoEffectsService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'
import { TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const TOOL_ID = 'video-reverse'
const DEFAULTS = { reverseAudio: true, speed: 1 }

export default function ReverseVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [range, setRange] = useState(null)
  const resolveRange = (meta) => range ?? { start: 0, end: meta?.duration ?? 0 }
  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-reverse.action')}
        actionIcon={Rewind}
        processingTitle={t('processing.reversingVideo')}
        successMessage="toasts.videoReversed"
        onFileChange={() => setRange(null)}
        canProcess={({ meta }) => !meta?.duration || !validateRange(resolveRange(meta), meta.duration)}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('reverse.title')}>
              <Switch label={t('reverse.audio')} description={t('reverse.audioHint')} checked={settings.reverseAudio} onChange={(reverseAudio) => updateSettings({ reverseAudio })} />
              <Slider label={t('speed.title')} value={settings.speed} min={0.25} max={3} step={0.25} origin={1} onChange={(speed) => updateSettings({ speed })} onDoubleClick={() => updateSettings({ speed: 1 })} formatValue={(value) => `${value}×`} />
              {meta?.duration && resolveRange(meta).end - resolveRange(meta).start > REVERSE_RECOMMENDED_MAX_SECONDS && (
                <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs leading-relaxed text-text-2">
                  <TriangleAlert size={14} className="mt-px shrink-0 text-warning" aria-hidden="true" />
                  {t('reverse.longWarning', { seconds: REVERSE_RECOMMENDED_MAX_SECONDS })}
                </p>
              )}
            </SettingsSection>
            {meta?.duration > 0 && (
              <SettingsSection title={t('audio.part')} description={t('reverse.partHint')}>
                <TimeRangeFields range={resolveRange(meta)} duration={meta.duration} onRangeChange={setRange} error={validateRange(resolveRange(meta), meta.duration)} />
              </SettingsSection>
            )}
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => reverseVideo(file, { ...settings, ...resolveRange(meta) }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.reverseComplete')} suffix="reversed" />}
      />
    </ToolLayout>
  )
}
