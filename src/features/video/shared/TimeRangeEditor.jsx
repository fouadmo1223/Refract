import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDuration, parseTimecode } from '@/lib/format'
import { useFilmstrip } from '@/hooks/useFilmstrip'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { VideoPreview } from '@/components/media/Previews'
import { VideoTimeline } from '@/components/media/VideoTimeline'

/**
 * Video + timeline for choosing a [start, end] range (trim, video→GIF).
 * "Play selection" loops playback inside the range.
 */
export function RangePreview({ file, meta, range, onRangeChange }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playingRange, setPlayingRange] = useState(false)
  const frames = useFilmstrip(file, { enabled: meta?.playable !== false })

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playingRange) return undefined
    if (video.currentTime < range.start || video.currentTime >= range.end) video.currentTime = range.start
    video.play().catch(() => setPlayingRange(false))
    return () => video.pause()
  }, [playingRange, range.end, range.start])

  const handleTimeUpdate = (event) => {
    const time = event.currentTarget.currentTime
    setCurrentTime(time)
    if (playingRange && time >= range.end) event.currentTarget.currentTime = range.start
  }

  const seek = (time) => {
    if (videoRef.current) videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  if (!meta?.duration) return <VideoPreview file={file} meta={meta} />

  return (
    <div className="flex flex-col gap-3">
      <VideoPreview file={file} meta={meta} videoRef={videoRef} onTimeUpdate={handleTimeUpdate} controls={!playingRange} />
      {meta.playable !== false && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <VideoTimeline duration={meta.duration} start={range.start} end={range.end} onChange={onRangeChange} currentTime={currentTime} onSeek={seek} frames={frames} />
          <div className="mt-2 flex items-center justify-between gap-3">
            <Button variant="secondary" size="sm" leftIcon={playingRange ? Pause : Play} onClick={() => setPlayingRange(!playingRange)}>
              {playingRange ? t('trim.pause') : t('trim.playSelection')}
            </Button>
            <p className="tabular text-[13px] text-muted">
              {t('trim.selected')}: <span className="font-semibold text-text">{formatDuration(range.end - range.start, { precise: true })}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Start/end text fields (accept "1:23.5" or seconds) with validation. */
export function TimeRangeFields({ range, duration, onRangeChange, error }) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState({ start: null, end: null })

  const commit = (key, text) => {
    const value = parseTimecode(text)
    setDrafts((current) => ({ ...current, [key]: null }))
    if (Number.isFinite(value)) onRangeChange({ ...range, [key]: Math.min(duration, Math.max(0, value)) })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {['start', 'end'].map((key) => {
        const draft = drafts[key]
        const invalidDraft = draft != null && !Number.isFinite(parseTimecode(draft))
        return (
          <Input
            key={key}
            label={t(`trim.${key}`)}
            value={draft ?? formatDuration(range[key], { precise: true })}
            onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
            onBlur={(event) => commit(key, event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && commit(key, event.currentTarget.value)}
            error={invalidDraft ? 'validation.timeFormat' : key === 'end' ? error : undefined}
            inputClassName="tabular"
            dir="ltr"
          />
        )
      })}
    </div>
  )
}

export function validateRange(range, duration) {
  if (!(range.end - range.start >= 0.1)) return 'validation.timeRangeOrder'
  if (duration && range.end > duration + 0.05) return 'validation.timeRangeBounds'
  return null
}
