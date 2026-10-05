import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, RotateCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

function PageCard({ item, number, thumb, sortable, selectable, selected, onToggle, onRotate, onRemove }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !sortable })
  // Thumbnails already include the page's own rotation; only the user's extra turn is applied here.
  const rotation = item.rotation ?? 0
  const quarterTurn = rotation % 180 !== 0

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group relative flex flex-col items-center gap-1.5', isDragging && 'z-10 opacity-80')}
    >
      <div
        role={selectable ? 'checkbox' : undefined}
        aria-checked={selectable ? selected : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? onToggle : undefined}
        onKeyDown={
          selectable
            ? (event) => {
                if (event.key !== ' ' && event.key !== 'Enter') return
                event.preventDefault()
                onToggle()
              }
            : undefined
        }
        className={cn(
          'relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-surface-2 p-1.5 ring-1 ring-inset transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-primary',
          selectable && 'cursor-pointer',
          selected ? 'ring-2 ring-primary' : 'ring-border hover:ring-border-strong',
        )}
      >
        {thumb?.url ? (
          <img
            src={thumb.url}
            alt={t('pdf.pageN', { number })}
            draggable={false}
            className="max-h-full max-w-full bg-white shadow-sm transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg) scale(${quarterTurn ? 0.75 : 1})` }}
          />
        ) : (
          <Spinner className="text-muted" />
        )}
        {selectable && (
          <span className={cn('absolute start-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition-colors', selected ? 'border-primary bg-primary text-primary-fg' : 'border-white/80 bg-black/20')}>
            {selected && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          </span>
        )}
        {(onRotate || onRemove || sortable) && (
          <div className="absolute end-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
            {sortable && (
              <button
                ref={setActivatorNodeRef}
                type="button"
                {...attributes}
                {...listeners}
                onClick={(event) => event.stopPropagation()}
                aria-label={t('pdf.movePage', { number })}
                className="flex size-6 cursor-grab items-center justify-center rounded-md bg-black/60 text-white active:cursor-grabbing"
              >
                <GripVertical size={13} aria-hidden="true" />
              </button>
            )}
            {onRotate && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRotate()
                }}
                aria-label={t('pdf.rotatePage', { number })}
                className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
              >
                <RotateCw size={13} aria-hidden="true" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove()
                }}
                aria-label={t('pdf.deletePage', { number })}
                className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white hover:bg-danger"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
      <span className="tabular text-xs text-muted">{t('pdf.pageShort', { number: item.index + 1 })}</span>
    </li>
  )
}

/**
 * Grid of PDF pages. `items` = [{ id, index (0-based source page), rotation }].
 * Optional: drag to reorder (onReorder), per-page rotate / remove, and selection.
 */
export function PdfPagesGrid({ items, thumbs, onReorder, onRotate, onRemove, selectedIds, onToggle, className }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const sortable = Boolean(onReorder)
  const grid = (
    <ul className={cn('grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5', className)}>
      {items.map((item, position) => (
        <PageCard
          key={item.id}
          item={item}
          number={position + 1}
          thumb={thumbs[item.index]}
          sortable={sortable}
          selectable={Boolean(onToggle)}
          selected={selectedIds?.has(item.id)}
          onToggle={() => onToggle?.(item.id)}
          onRotate={onRotate ? () => onRotate(item.id) : null}
          onRemove={onRemove ? () => onRemove(item.id) : null}
        />
      ))}
    </ul>
  )
  if (!sortable) return grid
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return
        const ids = items.map((item) => item.id)
        onReorder(arrayMove(items, ids.indexOf(active.id), ids.indexOf(over.id)))
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  )
}
