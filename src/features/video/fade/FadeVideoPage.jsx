import { useEffect, useRef, useState } from 'react'
import { Sparkles, Sunrise, Sunset } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { AUDIO_CURVES, DEFAULT_FADE, FADE_STYLES, fadeAmountAt, fadeColorFor, fadeVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-fade'

const PRESETS = {
  cinematic: { fadeIn: 1.5, fadeOut: 2, inStyle: 'black', outStyle: 'black', fadeAudio: true, audioCurve: 'smooth' },
  dreamy: { fadeIn: 2, fadeOut: 2, inStyle: 'blur', outStyle: 'blur', fadeAudio: true, audioCurve: 'smooth' },
  flash: { fadeIn: 0.5, fadeOut: 0.5, inStyle: 'white', outStyle: 'white', fadeAudio: true, audioCurve: 'linear' },
  quick: { fadeIn: 0.5, fadeOut: 0.5, inStyle: 'black', outStyle: 'black', fadeAudio: true, audioCurve: 'linear' },
  outro: { fadeIn: 0, fadeOut: 3, inStyle: 'black', outStyle: 'black', fadeAudio: true, audioCurve: 'easeIn' },
}

const isPresetActive = (settings, preset) => Object.entries(preset).every(([key, value]) => settings[key] === value)

/** Video with a CSS overlay that mimics the export (colour wash or blur) frame by frame. */
function FadePreview({ file, meta, settings }) {
  const url = useObjectUrl(file)
  const videoRef = useRef(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    let frame
    const tick = () => {
      if (videoRef.current) setTime(videoRef.current.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  if (meta?.playable === false || !meta?.duration) return <VideoPreview file={file} meta={meta} />
  const { amount, side } = fadeAmountAt(time, settings, meta.duration)
  const style = side === 'in' ? settings.inStyle : settings.outStyle
  const color = side === 'in' ? settings.inColor : settings.outColor

  return (
    <div className="flex flex-col gap-3">
      <MediaStage className="bg-black">
        <div className="relative mx-auto max-h-[60vh] overflow-hidden" style={{ aspectRatio: `${meta.width} / ${meta.height}`, width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}>
          {url && <video ref={videoRef} src={url} className="size-full" controls playsInline style={{ filter: style === 'blur' && amount > 0 ? `blur(${(amount * 18).toFixed(1)}px)` : undefined }} />}
          {style !== 'blur' && amount > 0 && <div className="pointer-events-none absolute inset-0" style={{ background: fadeColorFor(style, color), opacity: amount }} />}
        </div>
      </MediaStage>
      <FadeTimeline settings={settings} duration={meta.duration} time={time} onSeek={(value) => videoRef.current && (videoRef.current.currentTime = value)} />
    </div>
  )
}

/** Bar showing where the fades sit in the clip and their curve shape. Click to jump. */
function FadeTimeline({ settings, duration, time, onSeek }) {
  const { t } = useTranslation()
  const ramp = (side) => {
    const style = side === 'in' ? settings.inStyle : settings.outStyle
    const color = style === 'blur' ? 'rgba(148,163,184,0.85)' : fadeColorFor(style, side === 'in' ? settings.inColor : settings.outColor)
    return `linear-gradient(to ${side === 'in' ? 'right' : 'left'}, ${color}, transparent)`
  }
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div
        className="relative h-9 cursor-pointer overflow-hidden rounded-md bg-surface-2 ring-1 ring-inset ring-border"
        dir="ltr"
        role="slider"
        tabIndex={0}
        aria-label={t('fade.timeline')}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={time}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          onSeek(((event.clientX - box.left) / box.width) * duration)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onSeek(Math.max(0, time - 0.5))
          if (event.key === 'ArrowRight') onSeek(Math.min(duration, time + 0.5))
        }}
      >
        {settings.fadeIn > 0 && <div className="absolute inset-y-0 left-0 ring-1 ring-inset ring-white/20" style={{ width: `${(settings.fadeIn / duration) * 100}%`, background: ramp('in') }} />}
        {settings.fadeOut > 0 && <div className="absolute inset-y-0 right-0 ring-1 ring-inset ring-white/20" style={{ width: `${(settings.fadeOut / duration) * 100}%`, background: ramp('out') }} />}
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" style={{ left: `${(time / duration) * 100}%` }} />
      </div>
      <div className="tabular mt-1.5 flex justify-between text-xs text-muted" dir="ltr">
        <span>{settings.fadeIn > 0 ? `${t('fade.in')} · ${settings.fadeIn}s` : '0:00'}</span>
        <span className="font-medium text-text">{formatDuration(time, { precise: true })}</span>
        <span>{settings.fadeOut > 0 ? `${t('fade.out')} · ${settings.fadeOut}s` : formatDuration(duration)}</span>
      </div>
    </div>
  )
}

function FadeSide({ side, settings, updateSettings, maxLength }) {
  const { t } = useTranslation()
  const lengthKey = side === 'in' ? 'fadeIn' : 'fadeOut'
  const styleKey = side === 'in' ? 'inStyle' : 'outStyle'
  const colorKey = side === 'in' ? 'inColor' : 'outColor'
  const enabled = settings[lengthKey] > 0
  const Icon = side === 'in' ? Sunrise : Sunset

  return (
    <SettingsSection
      title={
        <span className="inline-flex items-center gap-1.5">
          <Icon size={13} aria-hidden="true" />
          {t(side === 'in' ? 'fade.in' : 'fade.out')}
        </span>
      }
      action={<Switch aria-label={t(side === 'in' ? 'fade.in' : 'fade.out')} checked={enabled} onChange={(checked) => updateSettings({ [lengthKey]: checked ? Math.min(1, maxLength) : 0 })} />}
    >
      <div className={cn('flex flex-col gap-3', !enabled && 'pointer-events-none opacity-50')} aria-disabled={!enabled}>
        <Slider
          label={t('fade.duration')}
          value={settings[lengthKey]}
          min={0}
          max={Math.max(0.25, Math.min(10, maxLength))}
          step={0.25}
          onChange={(value) => updateSettings({ [lengthKey]: value })}
          formatValue={(value) => `${value}s`}
        />
        <SegmentedControl
          label={t(side === 'in' ? 'fade.fromStyle' : 'fade.toStyle')}
          value={settings[styleKey]}
          onChange={(value) => updateSettings({ [styleKey]: value })}
          options={FADE_STYLES.map((value) => ({ value, label: t(`fade.styles.${value}`) }))}
        />
        {settings[styleKey] === 'color' && <ColorInput label={t('fade.color')} value={settings[colorKey]} onChange={(value) => updateSettings({ [colorKey]: value })} />}
      </div>
    </SettingsSection>
  )
}

export default function FadeVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULT_FADE)
  const settings = { ...DEFAULT_FADE, ...stored }
  const isValid = (meta) => Boolean(meta?.duration) && settings.fadeIn + settings.fadeOut > 0 && settings.fadeIn + settings.fadeOut <= meta.duration

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-fade.action')}
        actionIcon={Sunset}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={({ meta }) => isValid(meta)}
        renderPreview={({ file, meta }) => <FadePreview file={file} meta={meta} settings={settings} />}
        renderSettings={({ file, meta }) => {
          const duration = meta?.duration ?? 10
          return (
            <>
              <VideoInfo file={file} meta={meta} />
              <SettingsSection title={t('fade.presets')}>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
                  {Object.entries(PRESETS).map(([id, preset]) => {
                    const active = isPresetActive(settings, preset)
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateSettings({ ...preset, fadeIn: Math.min(preset.fadeIn, duration / 2), fadeOut: Math.min(preset.fadeOut, duration / 2) })}
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          active ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2/40 hover:border-border-strong',
                        )}
                      >
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-text">
                          {active && <Sparkles size={12} className="text-primary" aria-hidden="true" />}
                          {t(`fade.presetNames.${id}`)}
                        </span>
                        <span className="text-2xs text-muted">{t(`fade.presetHints.${id}`)}</span>
                      </button>
                    )
                  })}
                </div>
              </SettingsSection>
              <FadeSide side="in" settings={settings} updateSettings={updateSettings} maxLength={duration - settings.fadeOut} />
              <FadeSide side="out" settings={settings} updateSettings={updateSettings} maxLength={duration - settings.fadeIn} />
              <SettingsSection title={t('fade.audioTitle')}>
                <Switch label={t('fade.audio')} checked={settings.fadeAudio} onChange={(fadeAudio) => updateSettings({ fadeAudio })} />
                {settings.fadeAudio && (
                  <>
                  <SegmentedControl
                    label={t('fade.audioCurve')}
                    wrap
                    value={settings.audioCurve}
                    onChange={(audioCurve) => updateSettings({ audioCurve })}
                    options={Object.keys(AUDIO_CURVES).map((value) => ({ value, label: t(`fade.curves.${value}`) }))}
                  />
                  <p className="-mt-1 text-xs text-muted">{t(`fade.curveHints.${settings.audioCurve}`)}</p>
                  </>
                )}
              </SettingsSection>
              {!isValid(meta) && <p className="text-xs font-medium text-danger">{t(settings.fadeIn + settings.fadeOut === 0 ? 'validation.fadeRequired' : 'validation.fadeTooLong')}</p>}
            </>
          )
        }}
        onProcess={({ file, meta, signal, onProgress }) => fadeVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix="fade" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
