import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trimVideo } from '@/services/video/videoTrimService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { RangePreview, TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const TOOL_ID = 'video-trim'
const DEFAULTS = { precise: false }

export default function TrimVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [range, setRange] = useState(null)
  const resolveRange = (meta) => range ?? { start: 0, end: meta?.duration ?? 0 }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => setRange(null)}
        actionLabel={t('tools.video-trim.action')}
        actionIcon={Scissors}
        processingTitle={t('processing.trimmingVideo')}
        successMessage="toasts.videoTrimmed"
        canProcess={({ meta }) => Boolean(meta?.duration) && !validateRange(resolveRange(meta), meta.duration)}
        renderPreview={({ file, meta }) => <RangePreview file={file} meta={meta} range={resolveRange(meta)} onRangeChange={setRange} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('trim.range')}>
              <TimeRangeFields range={resolveRange(meta)} duration={meta?.duration ?? 0} onRangeChange={setRange} error={validateRange(resolveRange(meta), meta?.duration)} />
            </SettingsSection>
            <SettingsSection title={t('trim.mode')}>
              <Switch label={t('trim.precise')} description={t(settings.precise ? 'trim.preciseHint' : 'trim.fastHint')} checked={settings.precise} onChange={(precise) => updateSettings({ precise })} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => trimVideo(file, { ...resolveRange(meta), precise: settings.precise }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.trimComplete')} suffix="trimmed" />}
      />
    </ToolLayout>
  )
}
