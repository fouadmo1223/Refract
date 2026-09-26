import { useEffect, useRef, useState } from 'react'
import { EyeOff, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useFilmstrip } from '@/hooks/useFilmstrip'
import { DEFAULT_CENSOR_AREA, censorVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { IconButton } from '@/components/ui/IconButton'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage } from '@/components/layout/Panels'
import { RegionEditor } from '@/components/media/RegionEditor'
import { VideoPreview } from '@/components/media/Previews'
import { VideoTimeline } from '@/components/media/VideoTimeline'
import { CensorAreaList, areaEnd, pickStyle } from '@/features/image/censor/CensorAreaList'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-censor'
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
          <CensorAreaList
            regions={regions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setRegions}
            timing={{ duration: meta?.duration ?? 0, currentTime }}
            onDefaultsChange={updateDefaults}
          />
        )}
        onProcess={({ file, meta, signal, onProgress }) => censorVideo(file, { regions }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix="censored" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
