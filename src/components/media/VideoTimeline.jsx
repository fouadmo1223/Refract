import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'

/**
 * Trim timeline: filmstrip, draggable start/end handles, selected range and
 * playhead. Handles are keyboard-operable sliders (arrows = 0.1s, Shift = 1s).
 * Time flows left→right in every language, matching the video player.
 */
export function VideoTimeline({ duration, start, end, onChange, onChangeEnd, currentTime, onSeek, frames = [], minDuration = 0.1, className }) {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  const dragRef = useRef(null)

  const timeFromClientX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.min(duration, Math.max(0, ((clientX - rect.left) / rect.width) * duration))
  }

  const update = (handle, time) => {
    if (handle === 'start') onChange({ start: Math.min(time, end - minDuration), end })
    else onChange({ start, end: Math.max(time, start + minDuration) })
  }

  const startHandleDrag = (event, handle) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = handle
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const time = timeFromClientX(event.clientX)
    update(dragRef.current, time)
    onSeek?.(dragRef.current === 'start' ? Math.min(time, end - minDuration) : Math.max(time, start + minDuration))
  }

  const handlePointerUp = () => {
    if (dragRef.current) onChangeEnd?.()
    dragRef.current = null
  }

  const handleKeyDown = (event, handle) => {
    const step = event.shiftKey ? 1 : 0.1
    const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key]
    if (delta == null) return
    event.preventDefault()
    const base = handle === 'start' ? start : end
    update(handle, Math.min(duration, Math.max(0, base + delta)))
    onChangeEnd?.()
  }

  const pct = (time) => `${(time / duration) * 100}%`

  return (
    <div className={cn('select-none', className)} dir="ltr">
      <div
        ref={trackRef}
        className="relative h-14 cursor-pointer touch-none overflow-hidden rounded-md bg-surface-3"
        onPointerDown={(event) => {
          if (event.button === 0) onSeek?.(timeFromClientX(event.clientX))
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {frames.length > 0 && (
          <div className="absolute inset-0 flex">
            {frames.map((frame) => (
              <img key={frame} src={frame} alt="" className="h-full min-w-0 flex-1 object-cover" draggable={false} />
            ))}
          </div>
        )}
        <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: pct(start) }} />
        <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: `${100 - (end / duration) * 100}%` }} />
        <div className="pointer-events-none absolute inset-y-0 border-y-2 border-primary" style={{ left: pct(start), width: `${((end - start) / duration) * 100}%` }} />
        {currentTime != null && (
          <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" style={{ left: pct(currentTime) }} />
        )}
        {['start', 'end'].map((handle) => {
          const time = handle === 'start' ? start : end
          return (
            <div
              key={handle}
              role="slider"
              tabIndex={0}
              aria-label={t(handle === 'start' ? 'trim.startHandle' : 'trim.endHandle')}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration * 10) / 10}
              aria-valuenow={Math.round(time * 10) / 10}
              aria-valuetext={formatDuration(time, { precise: true })}
              onPointerDown={(event) => startHandleDrag(event, handle)}
              onKeyDown={(event) => handleKeyDown(event, handle)}
              className={cn(
                'absolute inset-y-0 z-10 flex w-3.5 cursor-ew-resize items-center justify-center bg-primary outline-none focus-visible:ring-3 focus-visible:ring-ring',
                handle === 'start' ? 'rounded-s-md' : 'rounded-e-md -translate-x-full',
              )}
              style={{ left: pct(time) }}
            >
              <span className="h-5 w-0.5 rounded-full bg-primary-fg/80" />
            </div>
          )
        })}
      </div>
      <div className="tabular mt-1.5 flex justify-between text-2xs text-muted">
        <span>0:00</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}
