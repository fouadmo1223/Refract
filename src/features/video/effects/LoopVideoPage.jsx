import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/lib/format'
import { loopVideo } from '@/services/video/videoEffectsService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-loop'
const DEFAULTS = { loops: 3, mode: 'repeat' }
const isValidLoops = (value) => Number.isInteger(value) && value >= 2 && value <= 50

export default function LoopVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const cycle = settings.mode === 'boomerang' ? 2 : 1
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
              <SegmentedControl
                label={t('loop.style')}
                value={settings.mode}
                onChange={(mode) => updateSettings({ mode })}
                options={['repeat', 'boomerang'].map((value) => ({ value, label: t(`loop.modes.${value}`) }))}
              />
              <p className="-mt-1 text-xs text-muted">{t(`loop.modeHints.${settings.mode}`)}</p>
              <NumberInput label={t('loop.count')} value={settings.loops} min={2} max={50} onChange={(loops) => updateSettings({ loops })} suffix="×" error={valid ? undefined : 'validation.loopCountRange'} />
              {valid && meta?.duration && (
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                  {t('speed.newDuration')}: <span className="font-semibold text-text">{formatDuration(meta.duration * settings.loops * cycle)}</span>
                </p>
              )}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => loopVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.loopComplete')} suffix={`${settings.mode === 'boomerang' ? 'boomerang' : 'loop'}-${settings.loops}x`} showSizeChange={settings.mode === 'boomerang'} />}
      />
    </ToolLayout>
  )
}
