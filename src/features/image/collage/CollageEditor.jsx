import { useRef, useState } from 'react'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { GripVertical, ImageUp, Move, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { MIN_SHARE, computeCollageLayout, placePhoto } from '@/services/image/collageService'
import { Spinner } from '@/components/ui/Spinner'

const REF_WIDTH = 1000
const pct = (value, total) => `${(value / total) * 100}%`
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
/** Keeps the drag thumbnail centred under the pointer. */
const snapCenterToCursor = ({ activatorEvent, draggingNodeRect, transform }) => {
  const coords = activatorEvent && draggingNodeRect ? getEventCoordinates(activatorEvent) : null
  if (!coords) return transform
  return { ...transform, x: transform.x + coords.x - draggingNodeRect.left - draggingNodeRect.width / 2, y: transform.y + coords.y - draggingNodeRect.top - draggingNodeRect.height / 2 }
}
const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes('Files')

/** Photo inside its cell, positioned exactly like the export (cover + zoom + focus). */
function PhotoImage({ preview, rect, item }) {
  if (!preview) return <Spinner className="text-muted" />
  const placed = placePhoto(preview.width, preview.height, rect, item)
  return (
    <img
      src={preview.url}
      alt=""
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none"
      style={{
        left: pct(placed.x - rect.x, rect.width),
        top: pct(placed.y - rect.y, rect.height),
        width: pct(placed.width, rect.width),
        height: pct(placed.height, rect.height),
      }}
    />
  )
}

function CollageCell({ item, preview, rect, layout, radius, selected, onSelect, onPan, onReplace, onRemove, onDropFile, dragging }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef: setDragRef, setActivatorNodeRef, isDragging } = useDraggable({ id: item.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: item.id })
  const [fileOver, setFileOver] = useState(false)
  const panRef = useRef(null)

  const setRefs = (node) => {
    setDragRef(node)
    setDropRef(node)
  }

  // Selected photo: dragging pans it inside its frame instead of moving it.
  const handlePointerDown = (event) => {
    if (!selected || event.button !== 0 || !preview) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = event.currentTarget.getBoundingClientRect()
    const placed = placePhoto(preview.width, preview.height, rect, { ...item, focusX: 0, focusY: 0 })
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      focusX: item.focusX,
      focusY: item.focusY,
      // Overflow of the photo past its frame, in screen pixels.
      overflowX: ((placed.width - rect.width) / rect.width) * box.width,
      overflowY: ((placed.height - rect.height) / rect.height) * box.height,
    }
  }
  const handlePointerMove = (event) => {
    const pan = panRef.current
    if (!pan) return
    onPan(item.id, {
      focusX: pan.overflowX > 0.5 ? clamp(pan.focusX - (event.clientX - pan.startX) / pan.overflowX, 0, 1) : pan.focusX,
      focusY: pan.overflowY > 0.5 ? clamp(pan.focusY - (event.clientY - pan.startY) / pan.overflowY, 0, 1) : pan.focusY,
    })
  }
  const endPan = (event) => {
    if (!panRef.current) return
    panRef.current = null
    onPan(item.id, null, event)
  }

  return (
    <div
      ref={setRefs}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={t('collage.photoLabel', { index: rect.index + 1, name: item.file.name })}
      className={cn(
        'group/cell absolute overflow-hidden bg-surface-2 outline-none transition-[box-shadow,opacity] duration-150',
        'flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'cursor-grab ring-2 ring-primary active:cursor-grabbing' : 'cursor-pointer hover:ring-2 hover:ring-primary/50',
        isDragging && 'opacity-35',
        (isOver && dragging && !isDragging) || fileOver ? 'ring-[3px] ring-primary' : null,
      )}
      style={{
        left: pct(rect.x, layout.width),
        top: pct(rect.y, layout.height),
        width: pct(rect.width, layout.width),
        height: pct(rect.height, layout.height),
        borderRadius: `min(${radius}cqw, ${(rect.width / layout.width) * 50}cqw)`,
      }}
      {...(selected ? {} : listeners)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(item.id)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item.id)
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          onRemove(item.id)
        }
      }}
      onPointerDown={selected ? handlePointerDown : listeners?.onPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        setFileOver(true)
      }}
      onDragLeave={() => setFileOver(false)}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        setFileOver(false)
        onDropFile(item.id, event.dataTransfer.files)
      }}
    >
      <PhotoImage preview={preview} rect={rect} item={item} />

      {fileOver && (
        <span className="absolute inset-0 flex items-center justify-center bg-primary/25 text-xs font-semibold text-white backdrop-blur-[1px]">{t('collage.dropToReplace')}</span>
      )}

      <span className="tabular absolute start-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/55 px-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
        {rect.index + 1}
      </span>

      <div
        className={cn(
          'absolute end-1.5 top-1.5 flex items-center gap-1 transition-opacity duration-150',
          selected ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 max-md:opacity-100',
        )}
      >
        <CellButton ref={setActivatorNodeRef} {...attributes} {...listeners} label={t('collage.move')} className="cursor-grab active:cursor-grabbing">
          <GripVertical size={14} aria-hidden="true" />
        </CellButton>
        <CellButton label={t('collage.replace')} onClick={() => onReplace(item.id)}>
          <ImageUp size={14} aria-hidden="true" />
        </CellButton>
        <CellButton label={t('common.remove')} onClick={() => onRemove(item.id)} className="hover:bg-danger">
          <Trash2 size={14} aria-hidden="true" />
        </CellButton>
      </div>

      {selected && (
        <span className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Move size={11} aria-hidden="true" />
          {t('collage.dragToReposition')}
        </span>
      )}
    </div>
  )
}

function CellButton({ label, children, className, onClick, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn('flex size-6 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white', className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Draggable divider between two photos (vertical) or two rows (horizontal).
 * Moves the boundary by pointer or arrow keys; double-click evens the pair.
 */
function Divider({ orientation, style, label, onResize, onEqualize, onCommit }) {
  const dragRef = useRef(null)
  const vertical = orientation === 'vertical'
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      title={label}
      className={cn(
        'group/divider absolute z-10 flex touch-none items-center justify-center outline-none',
        vertical ? '-translate-x-1/2 cursor-col-resize' : '-translate-y-1/2 cursor-row-resize',
      )}
      style={{ ...style, [vertical ? 'width' : 'height']: 16 }}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return
        const delta = vertical ? event.clientX - dragRef.current.x : event.clientY - dragRef.current.y
        dragRef.current = { x: event.clientX, y: event.clientY }
        onResize(delta, 'px')
      }}
      onPointerUp={() => {
        if (dragRef.current) onCommit?.()
        dragRef.current = null
      }}
      onPointerCancel={() => (dragRef.current = null)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onEqualize()
      }}
      onKeyDown={(event) => {
        const keys = vertical ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 }
        if (keys[event.key]) {
          event.preventDefault()
          onResize(keys[event.key] * (event.shiftKey ? 0.1 : 0.025), 'share')
        } else if (event.key === 'Enter') {
          event.preventDefault()
          onEqualize()
        }
      }}
    >
      <span
        className={cn(
          'rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.35)] transition-all duration-150',
          'opacity-0 group-hover/stage:opacity-80 group-hover/divider:opacity-100 group-focus-visible/divider:opacity-100 group-focus-visible/divider:ring-2 group-focus-visible/divider:ring-ring max-md:opacity-80',
          vertical ? 'h-8 max-h-[70%] w-1.5 group-hover/divider:h-12' : 'h-1.5 w-8 max-w-[70%] group-hover/divider:w-12',
        )}
      />
    </div>
  )
}

/**
 * Interactive collage canvas: drag photos onto each other to swap, drag the
 * lines between photos to resize, select a photo to pan it inside its frame,
 * and drop files from the desktop to replace or add photos.
 */
export function CollageEditor({ items, previews, settings, aspect, weights, onWeightsChange, selectedId, onSelect, onSwap, onPan, onReplace, onRemove, onDropFiles }) {
  const { t } = useTranslation()
  const stageRef = useRef(null)
  const [activeId, setActiveId] = useState(null)
  const [fileOver, setFileOver] = useState(false)
  const layout = computeCollageLayout({ count: items.length, settings, weights, width: REF_WIDTH, height: REF_WIDTH / aspect })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  const toRef = (delta, axis) => {
    const box = stageRef.current?.getBoundingClientRect()
    if (!box) return 0
    return axis === 'x' ? (delta / box.width) * layout.width : (delta / box.height) * layout.height
  }

  /** Shift the boundary between entries `index` and `index + 1` of a size list. */
  const shiftPair = (sizes, index, delta, total) => {
    const pair = sizes[index] + sizes[index + 1]
    const min = Math.min(total * MIN_SHARE, pair / 2)
    const first = clamp(sizes[index] + delta, min, pair - min)
    const next = [...sizes]
    next[index] = first
    next[index + 1] = pair - first
    return next
  }

  const resizeColumn = (row, col, delta, unit) => {
    const info = layout.rows[row]
    const sizes = info.cells.map((cell) => cell.width)
    const amount = unit === 'px' ? toRef(delta, 'x') : delta * info.usableWidth
    const cols = layout.weights.cols.map((list, index) => (index === row ? shiftPair(sizes, col, amount, info.usableWidth) : list))
    onWeightsChange({ ...layout.weights, cols })
  }
  const resizeRow = (row, delta, unit) => {
    const sizes = layout.rows.map((info) => info.height)
    const amount = unit === 'px' ? toRef(delta, 'y') : delta * layout.usableHeight
    onWeightsChange({ ...layout.weights, rows: shiftPair(sizes, row, amount, layout.usableHeight) })
  }
  const equalize = (list, index) => {
    const next = [...list]
    const average = (next[index] + next[index + 1]) / 2
    next[index] = average
    next[index + 1] = average
    return next
  }

  const activeItem = items.find((item) => item.id === activeId)
  const activeRect = activeItem ? layout.rects[items.indexOf(activeItem)] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => {
        setActiveId(active.id)
        onSelect(null)
      }}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active, over }) => {
        setActiveId(null)
        if (over && over.id !== active.id) onSwap(active.id, over.id)
      }}
      accessibility={{ screenReaderInstructions: { draggable: t('collage.dndInstructions') } }}
    >
      <div
        className="relative flex w-full items-center justify-center"
        onDragOver={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          setFileOver(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFileOver(false)
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          setFileOver(false)
          onDropFiles(event.dataTransfer.files)
        }}
      >
        {/* Width is limited so the stage never exceeds ~64vh in height, whatever the aspect. */}
        <div
          ref={stageRef}
          dir="ltr"
          className={cn('group/stage relative w-full shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_-8px_rgba(0,0,0,0.35)] transition-[outline] [container-type:inline-size]', fileOver && 'outline-2 outline-offset-4 outline-dashed outline-primary')}
          style={{ aspectRatio: `${layout.width} / ${layout.height}`, maxWidth: `calc(64vh * ${aspect})`, background: settings.background }}
          onClick={() => onSelect(null)}
        >
          {layout.rects.map((rect) => {
            const item = items[rect.index]
            return (
              <CollageCell
                key={item.id}
                item={item}
                preview={previews[item.id]}
                rect={rect}
                layout={layout}
                radius={settings.radius}
                selected={selectedId === item.id}
                dragging={Boolean(activeId)}
                onSelect={onSelect}
                onPan={onPan}
                onReplace={onReplace}
                onRemove={onRemove}
                onDropFile={(id, files) => onReplace(id, files)}
              />
            )
          })}

          {!activeId &&
            layout.rows.map((info, row) =>
              info.cells.slice(0, -1).map((cell, col) => (
                <Divider
                  key={`c${row}-${col}`}
                  orientation="vertical"
                  label={t('collage.resizeColumns')}
                  style={{ left: pct(cell.x + cell.width + layout.gap / 2, layout.width), top: pct(cell.y, layout.height), height: pct(cell.height, layout.height) }}
                  onResize={(delta, unit) => resizeColumn(row, col, delta, unit)}
                  onEqualize={() => onWeightsChange({ ...layout.weights, cols: layout.weights.cols.map((list, index) => (index === row ? equalize(list.map((_, i) => info.cells[i].width), col) : list)) })}
                />
              )),
            )}
          {!activeId &&
            layout.rows.slice(0, -1).map((info, row) => (
              <Divider
                key={`r${row}`}
                orientation="horizontal"
                label={t('collage.resizeRows')}
                style={{ top: pct(info.y + info.height + layout.gap / 2, layout.height), left: pct(layout.gap, layout.width), right: pct(layout.gap, layout.width) }}
                onResize={(delta, unit) => resizeRow(row, delta, unit)}
                onEqualize={() => onWeightsChange({ ...layout.weights, rows: equalize(layout.rows.map((entry) => entry.height), row) })}
              />
            ))}
        </div>
      </div>

      <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem && previews[activeItem.id] && activeRect ? (
          <div className="size-20 cursor-grabbing overflow-hidden rounded-lg shadow-xl ring-2 ring-primary">
            <img src={previews[activeItem.id].url} alt="" className="size-full object-cover" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
