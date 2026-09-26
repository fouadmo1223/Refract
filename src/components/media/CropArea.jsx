import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { clampRect, resizeRect } from './cropGeometry'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const HANDLE_POSITION = {
  nw: 'left-0 top-0 cursor-nwse-resize',
  n: 'left-1/2 top-0 cursor-ns-resize',
  ne: 'left-full top-0 cursor-nesw-resize',
  e: 'left-full top-1/2 cursor-ew-resize',
  se: 'left-full top-full cursor-nwse-resize',
  s: 'left-1/2 top-full cursor-ns-resize',
  sw: 'left-0 top-full cursor-nesw-resize',
  w: 'left-0 top-1/2 cursor-ew-resize',
}

/**
 * Interactive crop overlay. Coordinates are in the media's natural pixels,
 * so the same component crops images and video frames. The media element
 * is passed as children and must fill the container.
 *
 * Geometry is physical (x grows to the right) even in RTL — media isn't mirrored.
 */
export function CropArea({ mediaWidth, mediaHeight, rect, onChange, onChangeEnd, aspect, children, className, style, circle = false }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const bounds = { width: mediaWidth, height: mediaHeight }
  const minSize = Math.max(8, Math.min(mediaWidth, mediaHeight) * 0.03)

  const startDrag = (event, handle) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = containerRef.current.getBoundingClientRect()
    dragRef.current = { handle, startX: event.clientX, startY: event.clientY, startRect: rect, scale: mediaWidth / box.width }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.startX) * drag.scale
    const dy = (event.clientY - drag.startY) * drag.scale
    const next =
      drag.handle === 'move'
        ? clampRect({ ...drag.startRect, x: drag.startRect.x + dx, y: drag.startRect.y + dy }, bounds)
        : resizeRect(drag.startRect, drag.handle, dx, dy, bounds, aspect, minSize)
    onChange(next)
  }

  const handlePointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    onChangeEnd?.()
  }

  const handleKeyDown = (event) => {
    const step = (event.shiftKey ? 10 : 1) * Math.max(1, Math.round(mediaWidth / 200))
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    onChange(clampRect({ ...rect, x: rect.x + move[0], y: rect.y + move[1] }, bounds))
    onChangeEnd?.()
  }

  const percent = (value, total) => `${(value / total) * 100}%`

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={cn('relative mx-auto touch-none select-none overflow-hidden', className)}
      style={{ aspectRatio: `${mediaWidth} / ${mediaHeight}`, ...style }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
      <div
        role="group"
        tabIndex={0}
        aria-label={t('crop.area', { width: Math.round(rect.width), height: Math.round(rect.height) })}
        onPointerDown={(event) => startDrag(event, 'move')}
        onKeyDown={handleKeyDown}
        className="absolute cursor-move outline-none ring-primary focus-visible:ring-2"
        style={{
          left: percent(rect.x, mediaWidth),
          top: percent(rect.y, mediaHeight),
          width: percent(rect.width, mediaWidth),
          height: percent(rect.height, mediaHeight),
          boxShadow: '0 0 0 9999px rgba(10, 12, 15, 0.55)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 border border-white/90" />
        {circle && <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" />}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/35" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/35" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/35" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/35" />
        </div>
        {HANDLES.map((handle) => (
          <span
            key={handle}
            aria-hidden="true"
            onPointerDown={(event) => startDrag(event, handle)}
            className={cn('absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center', HANDLE_POSITION[handle])}
          >
            <span className={cn('block bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]', handle.length === 2 ? 'size-2.5 rounded-[2px]' : handle === 'n' || handle === 's' ? 'h-1 w-4 rounded-full' : 'h-4 w-1 rounded-full')} />
          </span>
        ))}
      </div>
    </div>
  )
}
