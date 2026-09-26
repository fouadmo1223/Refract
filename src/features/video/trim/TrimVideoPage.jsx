import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trimVideo } from '@/services/video/videoTrimService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { RangePreview, TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const TOOL_ID = 'video-trim'
const DEFAULTS = { precise: false, mode: 'keep', fadeIn: 0, fadeOut: 0 }
const seconds = (value) => `${value}s`

export default function TrimVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const reencodes = settings.mode === 'remove' || settings.fadeIn > 0 || settings.fadeOut > 0
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
            <SettingsSection title={t('trim.action')}>
              <SegmentedControl
                value={settings.mode}
                onChange={(mode) => updateSettings({ mode })}
                options={[
                  { value: 'keep', label: t('trim.modes.keep') },
                  { value: 'remove', label: t('trim.modes.remove') },
                ]}
              />
              <p className="-mt-1 text-xs text-muted">{t(`trim.modeHints.${settings.mode}`)}</p>
            </SettingsSection>
            <SettingsSection title={t('trim.range')}>
              <TimeRangeFields range={resolveRange(meta)} duration={meta?.duration ?? 0} onRangeChange={setRange} error={validateRange(resolveRange(meta), meta?.duration)} />
            </SettingsSection>
            <SettingsSection title={t('trim.mode')}>
              <Switch
                label={t('trim.precise')}
                description={t(settings.precise || reencodes ? 'trim.preciseHint' : 'trim.fastHint')}
                checked={settings.precise || reencodes}
                disabled={reencodes}
                onChange={(precise) => updateSettings({ precise })}
              />
            </SettingsSection>
            <SettingsSection title={t('trim.fades')}>
              <Slider label={t('fade.in')} value={settings.fadeIn} min={0} max={5} step={0.25} onChange={(fadeIn) => updateSettings({ fadeIn })} formatValue={seconds} />
              <Slider label={t('fade.out')} value={settings.fadeOut} min={0} max={5} step={0.25} onChange={(fadeOut) => updateSettings({ fadeOut })} formatValue={seconds} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => trimVideo(file, { ...resolveRange(meta), precise: settings.precise, mode: settings.mode, fadeIn: settings.fadeIn, fadeOut: settings.fadeOut }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.trimComplete')} suffix={settings.mode === 'remove' ? 'cut' : 'trimmed'} />}
      />
    </ToolLayout>
  )
}
