import { useRef, useState } from 'react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useOrderedTools, useToolPrefsStore } from '@/store/toolPrefsStore'
import { Button } from '@/components/ui/Button'
import { Stagger, StaggerItem } from '@/components/ui/Stagger'
import { ToolCard } from './ToolCard'

function SortableCard({ tool, compact, lastUsed, sortable, suppressClickRef }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: tool.id, disabled: !sortable })
  // Pointer/touch drags start anywhere on the card; keyboard drags only from the grip
  // handle, so Enter on the card still opens the tool. A drag that ends over the card
  // must not also trigger its link (onClickCapture below).

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group/sortable relative grid touch-manipulation', isDragging && 'z-10 opacity-90')}
      onMouseDown={sortable ? listeners?.onMouseDown : undefined}
      onTouchStart={sortable ? listeners?.onTouchStart : undefined}
      onClickCapture={(event) => {
        const { dragging, endedAt } = suppressClickRef.current
        if (dragging || performance.now() - endedAt < 250) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      <ToolCard tool={tool} compact={compact} lastUsed={lastUsed} dragging={isDragging} className={sortable ? 'pe-9' : undefined} />
      {sortable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          onKeyDown={listeners?.onKeyDown}
          aria-label={t('toolPrefs.dragHandle', { tool: t(`tools.${tool.id}.title`) })}
          aria-roledescription={t('toolPrefs.sortable')}
          className={cn(
            'absolute end-2 top-1/2 flex size-7 -translate-y-1/2 cursor-grab items-center justify-center rounded-md text-faint outline-none transition-opacity',
            'opacity-0 group-hover/sortable:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring max-md:opacity-60 hover:bg-surface-2 hover:text-text active:cursor-grabbing',
          )}
        >
          <GripVertical size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/**
 * Tool grid with a staggered entrance, drag-and-drop reordering (mouse, touch
 * and keyboard via the grip handle) and a pinned "last used" tool. Custom
 * orders persist per `listKey` in localStorage.
 */
export function SortableToolGrid({ listKey, tools, compact = false, className, sortable = true, inView = false, headerSlot }) {
  const { t } = useTranslation()
  const ordered = useOrderedTools(listKey, tools)
  const lastUsedId = useToolPrefsStore((state) => state.lastUsedId)
  const hasCustomOrder = useToolPrefsStore((state) => Boolean(state.orders[listKey]))
  const setOrder = useToolPrefsStore((state) => state.setOrder)
  const resetOrder = useToolPrefsStore((state) => state.resetOrder)
  // Blocks the click that browsers fire after a drag is dropped over a card.
  const suppressClickRef = useRef({ dragging: false, endedAt: 0 })
  const endDrag = () => {
    suppressClickRef.current = { dragging: false, endedAt: performance.now() }
    // Native capture listener runs before React's handlers and the link's default action.
    const blockClick = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('click', blockClick, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', blockClick, { capture: true }), 300)
  }
  const [announcement, setAnnouncement] = useState('')

  const sensors = useSensors(
    // Mouse drags after a small move; touch needs a long-press so normal scrolling still works.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }) => {
    endDrag()
    if (!over || active.id === over.id) return
    const ids = ordered.map((tool) => tool.id)
    const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
    setOrder(listKey, next)
    setAnnouncement(t('toolPrefs.moved', { tool: t(`tools.${active.id}.title`), position: next.indexOf(active.id) + 1 }))
  }

  return (
    <div className="flex flex-col gap-2">
      {(headerSlot || (sortable && hasCustomOrder)) && (
        <div className="flex items-center justify-end gap-2">
          {headerSlot}
          {sortable && hasCustomOrder && (
            <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => resetOrder(listKey)}>
              {t('toolPrefs.resetOrder')}
            </Button>
          )}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => (suppressClickRef.current = { dragging: true, endedAt: 0 })}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
        accessibility={{
          screenReaderInstructions: { draggable: t('toolPrefs.instructions') },
        }}
      >
        <SortableContext items={ordered.map((tool) => tool.id)} strategy={rectSortingStrategy}>
          <Stagger inView={inView} stagger={compact ? 0.03 : 0.045} className={className}>
            {ordered.map((tool) => (
              <StaggerItem key={tool.id} className="grid">
                <SortableCard tool={tool} compact={compact} lastUsed={tool.id === lastUsedId} sortable={sortable} suppressClickRef={suppressClickRef} />
              </StaggerItem>
            ))}
          </Stagger>
        </SortableContext>
      </DndContext>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
