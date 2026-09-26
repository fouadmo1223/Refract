import { useEffect, useRef, useState } from 'react'
import { Circle, Clock, Copy, EyeOff, Pause, Play, Square, Trash2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useFilmstrip } from '@/hooks/useFilmstrip'
import { DEFAULT_CENSOR_AREA, censorVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { RegionEditor, createRegionId } from '@/components/media/RegionEditor'
import { VideoPreview } from '@/components/media/Previews'
import { VideoTimeline } from '@/components/media/VideoTimeline'
import { TimeRangeFields } from '../shared/TimeRangeEditor'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-censor'
const STYLE_KEYS = ['mode', 'strength', 'color', 'shape']
const pickStyle = (source) => Object.fromEntries(STYLE_KEYS.map((key) => [key, source[key] ?? DEFAULT_CENSOR_AREA[key]]))
const areaEnd = (area, duration) => area.end ?? duration
const isActiveAt = (area, time, duration) => time >= (area.start ?? 0) - 0.05 && time <= areaEnd(area, duration) + 0.05

/** Approximate live effect inside an area; the export applies the exact FFmpeg filter. */
function AreaFill({ area }) {
  if (area.mode === 'solid') return <div className="size-full" style={{ background: area.color }} />
  const amount = (area.strength ?? 60) / 100
  const filter = area.mode === 'pixelate' ? `blur(${2 + amount * 6}px) contrast(1.6) saturate(1.2)` : `blur(${3 + amount * 17}px)`
  return <div className="size-full" style={{ backdropFilter: filter, WebkitBackdropFilter: filter }} />
}

function CensorStage({ file, meta, regions, onChange, selectedId, onSelect, defaults, videoRef, currentTime, onTime }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  const [playing, setPlaying] = useState(false)
  const frames = useFilmstrip(file, { enabled: meta?.playable !== false })
  const selected = regions.find((region) => region.id === selectedId)
  const duration = meta?.duration ?? 0

  if (meta?.playable === false || !meta?.width) return <VideoPreview file={file} meta={meta} />

  const seek = (time) => {
    if (videoRef.current) videoRef.current.currentTime = time
    onTime(time)
  }
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }
  const updateSelected = (patch) => onChange((current) => current.map((region) => (region.id === selectedId ? { ...region, ...patch } : region)))

  return (
    <div className="flex flex-col gap-3">
      <MediaStage className="bg-black">
        <RegionEditor
          mediaWidth={meta.width}
          mediaHeight={meta.height}
          regions={regions}
          onChange={onChange}
          selectedId={selectedId}
          onSelect={onSelect}
          newRegion={() => ({ ...pickStyle(defaults), start: 0, end: null })}
          renderFill={(region) => <AreaFill area={region} />}
          isRegionVisible={(region) => isActiveAt(region, currentTime, duration)}
          style={{ width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}
        >
          {url && (
            <video
              ref={videoRef}
              src={url}
              className="size-full"
              muted
              loop
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)}
            />
          )}
        </RegionEditor>
      </MediaStage>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="mb-2 flex items-center gap-2">
          <IconButton icon={playing ? Pause : Play} label={t(playing ? 'trim.pause' : 'censor.play')} size="sm" variant="secondary" onClick={togglePlay} />
          <p className="tabular text-[13px] text-muted" dir="ltr">
            <span className="font-semibold text-text">{formatDuration(currentTime, { precise: true })}</span> / {formatDuration(duration)}
          </p>
          <span className="flex-1" />
          <p className="truncate text-xs text-muted">{selected ? t('censor.timelineFor', { index: regions.indexOf(selected) + 1 }) : t('censor.timelineHint')}</p>
        </div>
        {selected ? (
          <VideoTimeline
            duration={duration}
            start={selected.start ?? 0}
            end={areaEnd(selected, duration)}
            onChange={({ start, end }) => updateSelected({ start, end: end >= duration - 0.01 ? null : end })}
            currentTime={currentTime}
            onSeek={seek}
            frames={frames}
          />
        ) : (
          <Slider aria-label={t('censor.seek')} value={currentTime} min={0} max={duration || 1} step={0.01} showValue={false} onChange={seek} />
        )}
      </div>
      <p className="text-xs text-muted">{t('censor.videoHint')}</p>
    </div>
  )
}

function AreaSettings({ area, index, duration, currentTime, onUpdate, onDuplicate, onRemove, onApplyToAll, canApplyToAll }) {
  const { t } = useTranslation()
  const wholeVideo = (area.start ?? 0) <= 0 && area.end == null
  const range = { start: area.start ?? 0, end: areaEnd(area, duration) }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={t('censor.effect')}
        value={area.mode}
        onChange={(mode) => onUpdate({ mode })}
        options={['blur', 'pixelate', 'solid'].map((mode) => ({ value: mode, label: t(`censor.modes.${mode}`) }))}
      />
      {area.mode === 'solid' ? (
        <ColorInput label={t('censor.fillColor')} value={area.color} onChange={(color) => onUpdate({ color })} />
      ) : (
        <Slider label={t('effects.strength')} value={area.strength} min={10} max={100} onChange={(strength) => onUpdate({ strength })} />
      )}
      <SegmentedControl
        label={t('censor.shape')}
        value={area.shape}
        onChange={(shape) => onUpdate({ shape })}
        options={[
          { value: 'rect', label: t('censor.shapes.rect'), icon: Square },
          { value: 'ellipse', label: t('censor.shapes.ellipse'), icon: Circle },
        ]}
      />

      <div className="flex flex-col gap-3">
        <Switch
          label={t('censor.wholeVideo')}
          description={wholeVideo ? t('censor.wholeVideoHint') : t('censor.timedHint', { start: formatDuration(range.start, { precise: true }), end: formatDuration(range.end, { precise: true }) })}
          checked={wholeVideo}
          onChange={(checked) => onUpdate(checked ? { start: 0, end: null } : { start: Math.min(currentTime, Math.max(0, duration - 1)), end: Math.min(duration, currentTime + Math.min(3, duration)) })}
        />
        {!wholeVideo && (
          <>
            <TimeRangeFields range={range} duration={duration} onRangeChange={({ start, end }) => onUpdate({ start: Math.min(start, end - 0.1), end: end >= duration - 0.01 ? null : end })} />
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="secondary" size="xs" leftIcon={Clock} onClick={() => onUpdate({ start: Math.min(currentTime, range.end - 0.1) })}>
                {t('censor.startHere')}
              </Button>
              <Button variant="secondary" size="xs" leftIcon={Clock} onClick={() => onUpdate({ end: Math.max(currentTime, range.start + 0.1) })}>
                {t('censor.endHere')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        <Button variant="ghost" size="xs" leftIcon={Copy} onClick={onDuplicate}>
          {t('censor.duplicate')}
        </Button>
        {canApplyToAll && (
          <Button variant="ghost" size="xs" leftIcon={Wand2} onClick={onApplyToAll}>
            {t('censor.applyToAll')}
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={onRemove} className="hover:text-danger" aria-label={t('censor.removeRegion', { index: index + 1 })}>
          {t('common.remove')}
        </Button>
      </div>
    </div>
  )
}

function AreaList({ regions, selectedId, onSelect, onChange, duration, currentTime, onDefaultsChange }) {
  const { t } = useTranslation()
  const update = (id, patch) => {
    onChange((current) => current.map((region) => (region.id === id ? { ...region, ...patch } : region)))
    // Remember the style for the next area the user draws.
    if (STYLE_KEYS.some((key) => key in patch)) onDefaultsChange(pickStyle({ ...regions.find((region) => region.id === id), ...patch }))
  }

  return (
    <SettingsSection
      title={t('censor.title')}
      action={
        regions.length > 0 && (
          <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={() => onChange([])}>
            {t('common.clear')}
          </Button>
        )
      }
    >
      {!regions.length && <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{t('censor.drawHint')}</p>}
      <ul className="flex flex-col gap-2">
        {regions.map((area, index) => {
          const open = area.id === selectedId
          const timed = (area.start ?? 0) > 0 || area.end != null
          return (
            <li key={area.id} className={cn('overflow-hidden rounded-lg border transition-colors', open ? 'border-primary/50 bg-primary-soft/30' : 'border-border bg-surface-2/40')}>
              <div className="flex items-center gap-1 pe-2">
              <button type="button" aria-expanded={open} onClick={() => onSelect(open ? null : area.id)} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 ps-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span className="tabular flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-2xs font-semibold text-primary-fg">{index + 1}</span>
                <span className="size-4 shrink-0 overflow-hidden border border-border-strong" style={{ borderRadius: area.shape === 'ellipse' ? '50%' : 3, background: area.mode === 'solid' ? area.color : 'repeating-linear-gradient(45deg, var(--color-muted) 0 2px, transparent 2px 4px)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-text">
                    {t(`censor.modes.${area.mode}`)}
                    {area.mode !== 'solid' && <span className="font-normal text-muted"> · {area.strength}</span>}
                  </span>
                  <span className="tabular block truncate text-xs text-muted" dir="auto">
                    {timed ? `${formatDuration(area.start ?? 0, { precise: true })} – ${formatDuration(areaEnd(area, duration), { precise: true })}` : t('censor.wholeVideo')}
                  </span>
                </span>
              </button>
                <IconButton
                  icon={Trash2}
                  label={t('censor.removeRegion', { index: index + 1 })}
                  size="xs"
                  variant="danger-ghost"
                  onClick={() => onChange(regions.filter((region) => region.id !== area.id))}
                />
              </div>
              {open && (
                <div className="border-t border-border px-3 pb-3 pt-3">
                  <AreaSettings
                    area={{ ...DEFAULT_CENSOR_AREA, ...area }}
                    index={index}
                    duration={duration}
                    currentTime={currentTime}
                    onUpdate={(patch) => update(area.id, patch)}
                    onRemove={() => onChange(regions.filter((region) => region.id !== area.id))}
                    onDuplicate={() => {
                      const id = createRegionId()
                      const offset = Math.round(Math.min(area.width, area.height) * 0.15)
                      onChange([...regions, { ...area, id, x: area.x + offset, y: area.y + offset }])
                      onSelect(id)
                    }}
                    canApplyToAll={regions.length > 1}
                    onApplyToAll={() => onChange((current) => current.map((region) => ({ ...region, ...pickStyle(area) })))}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </SettingsSection>
  )
}

export default function CensorVideoPage() {
  const { t } = useTranslation()
  const [defaults, updateDefaults] = useToolSettings(TOOL_ID, pickStyle(DEFAULT_CENSOR_AREA))
  const [regions, setRegions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef(null)

  useEffect(() => {
    if (selectedId && !regions.some((region) => region.id === selectedId)) setSelectedId(null)
  }, [regions, selectedId])

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => {
          setRegions([])
          setSelectedId(null)
          setCurrentTime(0)
        }}
        actionLabel={t('tools.video-censor.action')}
        actionIcon={EyeOff}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={regions.length > 0}
        renderPreview={({ file, meta }) => (
          <CensorStage
            file={file}
            meta={meta}
            regions={regions}
            onChange={setRegions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            defaults={defaults}
            videoRef={videoRef}
            currentTime={currentTime}
            onTime={setCurrentTime}
          />
        )}
        renderSettings={({ meta }) => (
          <AreaList
            regions={regions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setRegions}
            duration={meta?.duration ?? 0}
            currentTime={currentTime}
            onDefaultsChange={updateDefaults}
          />
        )}
        onProcess={({ file, meta, signal, onProgress }) => censorVideo(file, { regions }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix="censored" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
