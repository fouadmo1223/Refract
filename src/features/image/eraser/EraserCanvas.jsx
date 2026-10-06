import { useEffect, useReducer, useRef, useState } from 'react'
import { Eye, Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'

const ZOOMS = [1, 1.5, 2, 3, 4, 6]

/** Re-render whenever the engine reports a change (undo state, strokes). */
export function useEngineVersion(engine) {
  const [version, bump] = useReducer((value) => value + 1, 0)
  useEffect(() => engine?.subscribe(bump), [engine])
  return version
}

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * Paint surface for the eraser: brush strokes and magic-wand clicks, a brush
 * outline that follows the pointer, zoom, hold-to-compare and keyboard
 * shortcuts (Ctrl+Z / Ctrl+Shift+Z, [ and ] for size, E / R / W for tools).
 */
export function EraserCanvas({ engine, settings, updateSettings }) {
  const { t } = useTranslation()
  const canvasRef = useRef(null)
  const scrollRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [cursor, setCursor] = useState(null)
  const [comparing, setComparing] = useState(false)
  useEngineVersion(engine)

  // Redraw on every engine change and whenever the view mode flips.
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (comparing) {
        canvas.width = engine.width
        canvas.height = engine.height
        canvas.getContext('2d').drawImage(engine.image, 0, 0)
      } else engine.render(canvas, settings.view)
    }
    draw()
    return engine.subscribe(draw)
  }, [comparing, engine, settings.view])

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  useEffect(() => {
    const onKey = (event) => {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
        event.preventDefault()
        if (key === 'y' || event.shiftKey) engine.redo()
        else engine.undo()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const current = settingsRef.current
      if (key === '[') updateSettings({ size: Math.max(2, Math.round(current.size / 1.2)) })
      else if (key === ']') updateSettings({ size: Math.min(400, Math.round(current.size * 1.2)) })
      else if (key === 'e') updateSettings({ tool: 'erase' })
      else if (key === 'r') updateSettings({ tool: 'restore' })
      else if (key === 'w') updateSettings({ tool: 'wand' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine, updateSettings])

  const toImage = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * engine.width,
      y: ((event.clientY - rect.top) / rect.height) * engine.height,
      displayScale: rect.width / engine.width,
      left: event.clientX - rect.left,
      top: event.clientY - rect.top,
    }
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    const point = toImage(event)
    if (settings.tool === 'wand') {
      engine.wand(point, { tolerance: settings.tolerance, contiguous: settings.contiguous, mode: settings.wandMode, smooth: settings.smooth })
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    engine.beginStroke(point, { mode: settings.tool, size: settings.size, hardness: settings.hardness, strength: settings.strength })
  }
  const onPointerMove = (event) => {
    const point = toImage(event)
    setCursor(point)
    if (engine.activeStroke) engine.moveStroke(point)
  }
  const endStroke = () => engine.endStroke()

  const aspect = engine.width / engine.height
  const brushDiameter = cursor ? settings.size * cursor.displayScale : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <IconButton icon={Undo2} label={t('eraser.undo')} size="sm" variant="secondary" disabled={!engine.canUndo} onClick={() => engine.undo()} />
        <IconButton icon={Redo2} label={t('eraser.redo')} size="sm" variant="secondary" disabled={!engine.canRedo} onClick={() => engine.redo()} />
        <span className="mx-1 h-5 w-px bg-border" />
        <IconButton icon={ZoomOut} label={t('eraser.zoomOut')} size="sm" variant="ghost" disabled={zoom === ZOOMS[0]} onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])} />
        <span className="tabular w-11 text-center text-xs text-muted">{Math.round(zoom * 100)}%</span>
        <IconButton icon={ZoomIn} label={t('eraser.zoomIn')} size="sm" variant="ghost" disabled={zoom === ZOOMS.at(-1)} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])} />
        <IconButton icon={Maximize} label={t('eraser.fit')} size="sm" variant="ghost" disabled={zoom === 1} onClick={() => setZoom(1)} />
        <span className="flex-1" />
        <SegmentedControl
          size="sm"
          fullWidth={false}
          value={settings.view}
          onChange={(view) => updateSettings({ view })}
          options={[
            { value: 'checker', label: t('eraser.views.checker') },
            { value: 'tint', label: t('eraser.views.tint') },
          ]}
        />
        <IconButton
          icon={Eye}
          label={t('eraser.compare')}
          size="sm"
          variant="secondary"
          active={comparing}
          onPointerDown={() => setComparing(true)}
          onPointerUp={() => setComparing(false)}
          onPointerLeave={() => setComparing(false)}
        />
      </div>
      <div ref={scrollRef} className="checkerboard max-h-[68vh] overflow-auto rounded-lg border border-border">
        <div className="relative mx-auto" style={{ width: `calc(min(100%, ${(aspect * 66).toFixed(3)}vh) * ${zoom})` }}>
          <canvas
            ref={canvasRef}
            aria-label={t('eraser.canvasLabel')}
            className={cn('block h-auto w-full touch-none select-none', settings.tool === 'wand' ? 'cursor-crosshair' : 'cursor-none')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={() => setCursor(null)}
          />
          {cursor && settings.tool !== 'wand' && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
              style={{ left: cursor.left - brushDiameter / 2, top: cursor.top - brushDiameter / 2, width: brushDiameter, height: brushDiameter, background: settings.tool === 'restore' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)' }}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{t(settings.tool === 'wand' ? 'eraser.wandHint' : 'eraser.brushHint')}</p>
    </div>
  )
}
