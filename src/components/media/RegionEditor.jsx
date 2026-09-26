import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { clampRect } from './cropGeometry'

let regionCounter = 0
export function createRegionId() {
  regionCounter += 1
  return `region-${regionCounter}`
}

/**
 * Draw any number of rectangles over media (drag on empty space to add,
 * drag a box to move it, × to remove). Coordinates are in natural pixels so
 * the same regions apply to the full-resolution export. Arrow keys nudge the
 * focused box; Delete removes it.
 */
export function RegionEditor({ mediaWidth, mediaHeight, regions, onChange, children, className, style, previewClassName }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const bounds = { width: mediaWidth, height: mediaHeight }
  const minSize = Math.max(6, Math.min(mediaWidth, mediaHeight) * 0.02)

  const toMedia = (event) => {
    const box = containerRef.current.getBoundingClientRect()
    return {
      x: Math.min(mediaWidth, Math.max(0, ((event.clientX - box.left) / box.width) * mediaWidth)),
      y: Math.min(mediaHeight, Math.max(0, ((event.clientY - box.top) / box.height) * mediaHeight)),
    }
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toMedia(event)
    dragRef.current = { type: 'draw', origin: point }
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const startMove = (event, region) => {
    event.stopPropagation()
    if (event.button !== 0) return
    containerRef.current.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'move', id: region.id, origin: toMedia(event), start: region }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const point = toMedia(event)
    if (drag.type === 'draw') {
      setDraft({
        x: Math.min(point.x, drag.origin.x),
        y: Math.min(point.y, drag.origin.y),
        width: Math.abs(point.x - drag.origin.x),
        height: Math.abs(point.y - drag.origin.y),
      })
    } else {
      const moved = clampRect({ ...drag.start, x: drag.start.x + point.x - drag.origin.x, y: drag.start.y + point.y - drag.origin.y }, bounds)
      onChange(regions.map((region) => (region.id === drag.id ? { ...region, ...moved } : region)))
    }
  }

  const handlePointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.type === 'draw' && draft && draft.width >= minSize && draft.height >= minSize) {
      onChange([...regions, { ...draft, id: createRegionId() }])
    }
    setDraft(null)
  }

  const handleKeyDown = (event, region) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onChange(regions.filter((item) => item.id !== region.id))
      return
    }
    const step = (event.shiftKey ? 10 : 1) * Math.max(1, Math.round(mediaWidth / 200))
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (!move) return
    event.preventDefault()
    const moved = clampRect({ ...region, x: region.x + move[0], y: region.y + move[1] }, bounds)
    onChange(regions.map((item) => (item.id === region.id ? { ...item, ...moved } : item)))
  }

  const percent = (value, total) => `${(value / total) * 100}%`
  const boxStyle = (rect) => ({
    left: percent(rect.x, mediaWidth),
    top: percent(rect.y, mediaHeight),
    width: percent(rect.width, mediaWidth),
    height: percent(rect.height, mediaHeight),
  })

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={cn('relative mx-auto cursor-crosshair touch-none select-none overflow-hidden', className)}
      style={{ aspectRatio: `${mediaWidth} / ${mediaHeight}`, ...style }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={t('censor.editorLabel')}
      role="application"
    >
      <div className={cn('size-full', previewClassName)}>{children}</div>
      {regions.map((region, index) => (
        <div
          key={region.id}
          role="button"
          tabIndex={0}
          aria-label={t('censor.region', { index: index + 1 })}
          onPointerDown={(event) => startMove(event, region)}
          onKeyDown={(event) => handleKeyDown(event, region)}
          className="absolute cursor-move border-2 border-white bg-primary/25 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] outline-none focus-visible:border-primary"
          style={boxStyle(region)}
        >
          <span className="tabular absolute -top-2.5 start-1 rounded-sm bg-primary px-1 text-2xs font-semibold text-primary-fg">{index + 1}</span>
          <button
            type="button"
            aria-label={t('censor.removeRegion', { index: index + 1 })}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onChange(regions.filter((item) => item.id !== region.id))}
            className="absolute -end-2.5 -top-2.5 flex size-5 items-center justify-center rounded-full bg-white text-zinc-800 shadow-sm hover:bg-danger hover:text-white"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      ))}
      {draft && <div className="pointer-events-none absolute border-2 border-dashed border-white bg-white/15" style={boxStyle(draft)} />}
    </div>
  )
}
