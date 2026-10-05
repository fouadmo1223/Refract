import { memo } from 'react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileText, GripVertical, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { IconButton } from '@/components/ui/IconButton'

const Row = memo(function Row({ item, position, detail, onRemove, disabled }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  const isImage = item.file.type.startsWith('image/')
  const thumb = useObjectUrl(isImage ? item.file : null)
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('flex items-center gap-3 bg-surface px-3 py-2.5', isDragging && 'relative z-10 shadow-lg')}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('pdf.moveFile', { name: item.file.name })}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-faint outline-none hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical size={15} aria-hidden="true" />
      </button>
      <span className="tabular w-5 shrink-0 text-xs font-semibold text-muted">{position + 1}</span>
      <div className="checkerboard flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-inset ring-border">
        {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : <FileText size={16} className="text-muted" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text" dir="auto">
          {item.file.name}
        </p>
        <p className="tabular text-xs text-muted">
          {formatBytes(item.file.size)}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      <IconButton icon={X} label={t('common.removeFile')} size="sm" variant="danger-ghost" disabled={disabled} onClick={() => onRemove(item.id)} />
    </li>
  )
})

/** Drag-to-reorder list of files (mouse, touch and keyboard via the grip). */
export function SortableFileList({ items, onChange, details = {}, disabled = false }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return
        const ids = items.map((item) => item.id)
        onChange(arrayMove(items, ids.indexOf(active.id), ids.indexOf(over.id)))
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item, position) => (
            <Row key={item.id} item={item} position={position} detail={details[item.id]} disabled={disabled} onRemove={(id) => onChange(items.filter((entry) => entry.id !== id))} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
