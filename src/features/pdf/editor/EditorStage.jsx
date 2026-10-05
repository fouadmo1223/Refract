import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ExternalLink, Move } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { cssFontFamily } from '@/services/pdf/pdfEditService'
import { renderPdfPage } from '@/services/pdf/pdfService'
import { Spinner } from '@/components/ui/Spinner'
import { boundsOf, createElement, createLine, newId, translate } from './editorModel'

const CORNERS = ['nw', 'ne', 'sw', 'se']
const BOX_TOOLS = ['text', 'rect', 'ellipse', 'highlight', 'whiteout', 'link']

/** Page bitmap rendered at the on-screen size (× device pixel ratio). */
function PageCanvas({ pdf, pageNumber, scale }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    setReady(false)
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    renderPdfPage(pdf, pageNumber, { scale: scale * ratio })
      .then((rendered) => {
        if (cancelled || !canvasRef.current) return
        const target = canvasRef.current
        target.width = rendered.width
        target.height = rendered.height
        target.getContext('2d').drawImage(rendered, 0, 0)
        setReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pdf, pageNumber, scale])
  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="text-muted" />
        </div>
      )}
    </>
  )
}

function ImageElement({ element }) {
  const url = useObjectUrl(element.blob)
  return url ? <img src={url} alt="" draggable={false} className="pointer-events-none size-full select-none object-fill" style={{ opacity: element.opacity }} /> : null
}

/** Visual for box-shaped elements (everything except lines and drawings). */
function BoxElement({ element, scale, selected, onTextChange }) {
  const { t } = useTranslation()
  const px = (value) => `${value * scale}px`
  if (element.type === 'text') {
    const style = {
      fontFamily: cssFontFamily(element.fontFamily),
      fontSize: px(element.fontSize),
      fontWeight: element.bold ? 700 : 400,
      fontStyle: element.italic ? 'italic' : 'normal',
      textDecoration: element.underline ? 'underline' : 'none',
      color: element.color,
      textAlign: element.align,
      lineHeight: element.lineHeight,
      opacity: element.opacity,
      background: element.background && element.background !== 'transparent' ? element.background : 'transparent',
    }
    return selected ? (
      <textarea
        autoFocus={!element.text}
        value={element.text}
        onChange={(event) => onTextChange(event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder={t('pdfEditor.typeHere')}
        dir="auto"
        spellCheck={false}
        className="size-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-black/30"
        style={style}
      />
    ) : (
      <div className="size-full overflow-hidden whitespace-pre-wrap break-words" dir="auto" style={style}>
        {element.text || <span className="text-black/30">{t('pdfEditor.typeHere')}</span>}
      </div>
    )
  }
  if (element.type === 'image') return <ImageElement element={element} />
  if (element.type === 'link') {
    return (
      <div className="flex size-full items-start justify-end border border-dashed border-blue-500 bg-blue-500/10">
        <span className="m-0.5 flex items-center gap-0.5 rounded bg-blue-600 px-1 text-[10px] leading-4 text-white">
          <ExternalLink size={9} aria-hidden="true" />
          {t('pdfEditor.link')}
        </span>
      </div>
    )
  }
  const fill = element.fill && element.fill !== 'transparent' ? element.fill : 'transparent'
  return (
    <div
      className="size-full"
      style={{
        background: fill,
        opacity: element.opacity,
        mixBlendMode: element.type === 'highlight' ? 'multiply' : undefined,
        borderRadius: element.type === 'ellipse' ? '50%' : 0,
        border: (element.type === 'rect' || element.type === 'ellipse') && element.strokeWidth > 0 ? `${element.strokeWidth * scale}px solid ${element.stroke}` : undefined,
        boxShadow: element.type === 'whiteout' && !selected ? '0 0 0 1px rgba(0,0,0,0.04)' : undefined,
      }}
    />
  )
}

/**
 * One editable page: pdf.js bitmap + element layer. Coordinates are PDF points
 * (top-left origin) and scaled to pixels with `scale`.
 */
export function EditorStage({ pdf, pageNumber, pageSize, zoom, elements, onChange, onCommit, selectedId, onSelect, tool, style, textItems, onEditText, onToolDone, pendingImage, onImagePlaced }) {
  const { t } = useTranslation()
  const wrapRef = useRef(null)
  const layerRef = useRef(null)
  const dragRef = useRef(null)
  const [fitWidth, setFitWidth] = useState(800)
  const [draft, setDraft] = useState(null)
  const scale = (fitWidth / pageSize.width) * zoom

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => setFitWidth(Math.max(240, entry.contentRect.width - 32)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const toPoint = (event) => {
    const box = layerRef.current.getBoundingClientRect()
    return { x: Math.min(pageSize.width, Math.max(0, (event.clientX - box.left) / scale)), y: Math.min(pageSize.height, Math.max(0, (event.clientY - box.top) / scale)) }
  }
  const replace = (id, next) => elements.map((element) => (element.id === id ? next : element))

  const handleLayerDown = (event) => {
    if (event.button !== 0) return
    const point = toPoint(event)
    if (pendingImage) {
      // Place the chosen image centred on the click, sized to ~40% of the page width.
      const width = Math.min(pageSize.width * 0.4, pendingImage.width)
      const height = width * (pendingImage.height / pendingImage.width)
      const element = { id: newId(), type: 'image', blob: pendingImage.blob, x: Math.max(0, point.x - width / 2), y: Math.max(0, point.y - height / 2), width, height, opacity: 1 }
      onCommit([...elements, element])
      onSelect(element.id)
      onImagePlaced()
      return
    }
    if (tool === 'select' || tool === 'editText') {
      onSelect(null)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'draw') {
      dragRef.current = { type: 'draw', element: { id: newId(), type: 'draw', points: [[point.x, point.y]], stroke: style.stroke, strokeWidth: style.strokeWidth, opacity: 1 } }
      setDraft(dragRef.current.element)
    } else if (tool === 'line' || tool === 'arrow') {
      dragRef.current = { type: 'line', origin: point }
      setDraft(createLine(tool, point, point, style))
    } else if (BOX_TOOLS.includes(tool)) {
      dragRef.current = { type: 'box', origin: point }
      setDraft({ type: 'box', x: point.x, y: point.y, width: 0, height: 0 })
    }
  }

  const startMove = (event, element) => {
    if (event.button !== 0 || tool !== 'select') return
    event.stopPropagation()
    onSelect(element.id)
    layerRef.current.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'move', id: element.id, origin: toPoint(event), start: element, moved: false }
  }
  const startResize = (event, element, corner) => {
    event.stopPropagation()
    layerRef.current.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'resize', id: element.id, corner, origin: toPoint(event), start: element }
  }
  const startEndpoint = (event, element, end) => {
    event.stopPropagation()
    layerRef.current.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'endpoint', id: element.id, end, start: element }
  }

  const handleMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const point = toPoint(event)
    if (drag.type === 'draw') {
      drag.element = { ...drag.element, points: [...drag.element.points, [point.x, point.y]] }
      setDraft(drag.element)
    } else if (drag.type === 'line') {
      setDraft(createLine(tool, drag.origin, point, style))
    } else if (drag.type === 'box') {
      setDraft({ type: 'box', x: Math.min(point.x, drag.origin.x), y: Math.min(point.y, drag.origin.y), width: Math.abs(point.x - drag.origin.x), height: Math.abs(point.y - drag.origin.y) })
    } else if (drag.type === 'move') {
      drag.moved = true
      onChange(replace(drag.id, translate(drag.start, point.x - drag.origin.x, point.y - drag.origin.y)))
    } else if (drag.type === 'resize') {
      const { start, corner } = drag
      const dx = point.x - drag.origin.x
      const dy = point.y - drag.origin.y
      let { x, y, width, height } = start
      if (corner.includes('w')) {
        x = Math.min(start.x + dx, start.x + start.width - 8)
        width = start.width - (x - start.x)
      } else width = Math.max(8, start.width + dx)
      if (corner.includes('n')) {
        y = Math.min(start.y + dy, start.y + start.height - 8)
        height = start.height - (y - start.y)
      } else height = Math.max(8, start.height + dy)
      if (start.type === 'image' && event.shiftKey === false) {
        // Images keep their proportions unless Shift is held.
        const ratio = start.width / start.height
        height = width / ratio
        if (corner.includes('n')) y = start.y + start.height - height
      }
      onChange(replace(drag.id, { ...start, x, y, width, height }))
    } else if (drag.type === 'endpoint') {
      onChange(replace(drag.id, { ...drag.start, ...(drag.end === 1 ? { x1: point.x, y1: point.y } : { x2: point.x, y2: point.y }) }))
    }
  }

  const handleUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (drag.type === 'draw') {
      setDraft(null)
      if (drag.element.points.length > 1) onCommit([...elements, drag.element])
      return
    }
    if (drag.type === 'line') {
      const line = draft
      setDraft(null)
      if (line && Math.hypot(line.x2 - line.x1, line.y2 - line.y1) > 3) {
        onCommit([...elements, line])
        onSelect(line.id)
        onToolDone()
      }
      return
    }
    if (drag.type === 'box') {
      const box = draft
      setDraft(null)
      // A click without dragging still creates a default-sized element.
      const sized = box && (box.width < 4 || box.height < 4) ? { ...box, width: tool === 'text' ? 180 : 120, height: tool === 'text' ? style.fontSize * 1.6 : tool === 'link' ? 24 : 60 } : box
      const element = sized && createElement(tool, sized, style)
      if (element) {
        onCommit([...elements, element])
        onSelect(element.id)
        onToolDone()
      }
      return
    }
    onCommit(elements)
  }

  const lineElements = elements.filter((element) => element.type === 'line' || element.type === 'draw')
  const boxElements = elements.filter((element) => element.type !== 'line' && element.type !== 'draw')
  const selected = elements.find((element) => element.id === selectedId)
  const pathFor = (element) => (element.type === 'draw' ? `M${element.points.map(([x, y]) => `${x * scale},${y * scale}`).join(' L')}` : `M${element.x1 * scale},${element.y1 * scale} L${element.x2 * scale},${element.y2 * scale}`)
  const arrowHead = (element) => {
    const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1)
    const size = Math.max(6, element.strokeWidth * 4) * scale
    const tip = [element.x2 * scale, element.y2 * scale]
    const side = (sign) => [tip[0] + Math.cos(angle + Math.PI + (sign * Math.PI) / 7) * size, tip[1] + Math.sin(angle + Math.PI + (sign * Math.PI) / 7) * size]
    return `M${side(-1).join(',')} L${tip.join(',')} L${side(1).join(',')}`
  }
  const cursor = pendingImage ? 'cursor-copy' : tool === 'select' ? 'cursor-default' : tool === 'editText' ? 'cursor-text' : 'cursor-crosshair'

  return (
    <div ref={wrapRef} className="scrollbar-thin flex w-full justify-center overflow-auto rounded-lg border border-border bg-surface-2 p-4" style={{ maxHeight: '78vh' }}>
      <div
        ref={layerRef}
        dir="ltr"
        className={cn('relative shrink-0 touch-none bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]', cursor)}
        style={{ width: pageSize.width * scale, height: pageSize.height * scale }}
        onPointerDown={handleLayerDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      >
        <PageCanvas pdf={pdf} pageNumber={pageNumber} scale={scale} />

        {tool === 'editText' &&
          textItems.map((item, index) => (
            <button
              key={`${index}-${item.x}`}
              type="button"
              title={t('pdfEditor.editThisText')}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onEditText(item)}
              className="absolute rounded-[2px] outline outline-1 outline-blue-500/40 transition-colors hover:bg-blue-500/15 hover:outline-blue-500"
              style={{ left: item.x * scale, top: item.y * scale, width: item.width * scale, height: item.height * scale }}
            />
          ))}

        {boxElements.map((element) => {
          const isSelected = element.id === selectedId
          return (
            <div
              key={element.id}
              className={cn('absolute', tool === 'select' && 'cursor-move', isSelected && 'outline outline-2 outline-offset-1 outline-primary')}
              style={{ left: element.x * scale, top: element.y * scale, width: element.width * scale, height: element.height * scale }}
              onPointerDown={(event) => (element.type === 'text' && isSelected ? event.stopPropagation() : startMove(event, element))}
            >
              <BoxElement element={element} scale={scale} selected={isSelected} onTextChange={(text) => onChange(replace(element.id, { ...element, text }))} />
              {isSelected && element.type === 'text' && (
                <button
                  type="button"
                  aria-label={t('pdfEditor.move')}
                  onPointerDown={(event) => startMove(event, element)}
                  className="absolute -top-6 start-0 flex h-5 cursor-move items-center gap-1 rounded bg-primary px-1.5 text-[10px] font-medium text-primary-fg shadow"
                >
                  <Move size={10} aria-hidden="true" />
                  {t('pdfEditor.move')}
                </button>
              )}
              {isSelected &&
                CORNERS.map((corner) => (
                  <span
                    key={corner}
                    onPointerDown={(event) => startResize(event, element, corner)}
                    className={cn(
                      'absolute size-3 rounded-full border-2 border-primary bg-white shadow-sm',
                      corner === 'nw' && '-left-1.5 -top-1.5 cursor-nwse-resize',
                      corner === 'ne' && '-right-1.5 -top-1.5 cursor-nesw-resize',
                      corner === 'sw' && '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                      corner === 'se' && '-bottom-1.5 -right-1.5 cursor-nwse-resize',
                    )}
                  />
                ))}
            </div>
          )
        })}

        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
          {[...lineElements, ...(draft && draft.type !== 'box' ? [draft] : [])].map((element) => {
            const isSelected = element.id === selectedId
            return (
              <g key={element.id} opacity={element.opacity}>
                {/* Wide transparent stroke makes thin lines easy to grab. */}
                <path d={pathFor(element)} stroke="transparent" strokeWidth={Math.max(12, element.strokeWidth * scale + 8)} fill="none" className="pointer-events-auto cursor-move" onPointerDown={(event) => startMove(event, element)} />
                <path d={pathFor(element)} stroke={element.stroke} strokeWidth={element.strokeWidth * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {element.type === 'line' && element.arrow && <path d={arrowHead(element)} stroke={element.stroke} strokeWidth={element.strokeWidth * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                {isSelected && element.type === 'draw' && (() => {
                  const b = boundsOf(element)
                  return <rect x={b.x * scale - 3} y={b.y * scale - 3} width={b.width * scale + 6} height={b.height * scale + 6} fill="none" stroke="var(--color-primary)" strokeDasharray="4 3" />
                })()}
              </g>
            )
          })}
        </svg>
        {selected?.type === 'line' &&
          [1, 2].map((end) => (
            <span
              key={end}
              onPointerDown={(event) => startEndpoint(event, selected, end)}
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-primary bg-white shadow-sm"
              style={{ left: selected[`x${end}`] * scale, top: selected[`y${end}`] * scale }}
            />
          ))}

        {draft?.type === 'box' && (
          <div className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10" style={{ left: draft.x * scale, top: draft.y * scale, width: draft.width * scale, height: draft.height * scale }} />
        )}
      </div>
    </div>
  )
}
