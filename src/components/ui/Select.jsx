import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { useFloatingPosition } from './floating'
import { Portal } from './Portal'
import { mergeRefs } from '@/lib/mergeRefs'

/**
 * Custom select (ARIA combobox + listbox, active-descendant pattern).
 * Focus stays on the trigger; arrows / Home / End / typeahead move the
 * highlighted option, Enter or Space selects, Escape closes.
 *
 * options: [{ value, label, description?, icon?, meta?, disabled? }]
 */
export function Select({
  label,
  description,
  error,
  hint,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  triggerClassName,
  id,
  'aria-label': ariaLabel,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = useId()
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const typeaheadRef = useRef({ text: '', timer: 0 })
  const { refs, floatingStyles } = useFloatingPosition({ open, matchWidth: true })
  const setTriggerRef = useMemo(() => mergeRefs(triggerRef, refs.setReference), [refs.setReference])

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options[selectedIndex]

  const openList = (index = selectedIndex) => {
    if (disabled) return
    setActiveIndex(index >= 0 ? index : options.findIndex((option) => !option.disabled))
    setOpen(true)
  }
  const closeList = ({ focus = true } = {}) => {
    setOpen(false)
    if (focus) triggerRef.current?.focus()
  }
  const selectIndex = (index) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    closeList()
  }
  const moveActive = (direction) => {
    if (!options.length) return
    let next = activeIndex
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length
      if (!options[next].disabled) break
    }
    setActiveIndex(next)
  }

  // Close on outside pointer-down.
  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const handleTypeahead = (key) => {
    const state = typeaheadRef.current
    clearTimeout(state.timer)
    state.text += key.toLowerCase()
    state.timer = setTimeout(() => (state.text = ''), 500)
    const start = open ? activeIndex + 1 : selectedIndex + 1
    const ordered = [...options.slice(start), ...options.slice(0, start)]
    const match = ordered.find((option) => !option.disabled && String(option.label).toLowerCase().startsWith(state.text))
    if (!match) return
    const index = options.indexOf(match)
    if (open) setActiveIndex(index)
    else onChange(match.value)
  }

  const handleKeyDown = (event) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList()
        else moveActive(event.key === 'ArrowDown' ? 1 : -1)
        break
      case 'Home':
      case 'End':
        if (!open) return
        event.preventDefault()
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) selectIndex(activeIndex)
        else openList()
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          event.stopPropagation()
          closeList()
        }
        break
      case 'Tab':
        if (open) closeList({ focus: false })
        break
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) handleTypeahead(event.key)
    }
  }

  const SelectedIcon = selected?.icon

  return (
    <Field label={label} description={description} error={error} hint={hint} className={className} id={id}>
      {({ id: fieldId, describedBy, invalid }) => (
        <>
          <button
            ref={setTriggerRef}
            id={fieldId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => (open ? closeList() : openList())}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border bg-surface px-3 text-start text-sm text-text shadow-xs outline-none',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring',
              invalid ? 'border-danger' : 'border-border hover:border-border-strong',
              open && 'border-primary ring-3 ring-ring',
              disabled && 'cursor-not-allowed opacity-55',
              triggerClassName,
            )}
          >
            {SelectedIcon && <SelectedIcon size={15} className="shrink-0 text-muted" aria-hidden="true" />}
            <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-faint')}>
              {selected ? selected.label : (placeholder ?? t('common.select'))}
            </span>
            {selected?.meta && <span className="tabular shrink-0 text-xs text-muted">{selected.meta}</span>}
            <ChevronDown size={15} className={cn('shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')} aria-hidden="true" />
          </button>
          <Portal>
            <AnimatePresence>
              {open && (
                <div ref={refs.setFloating} style={floatingStyles} className="z-[60] flex">
                  <motion.ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-labelledby={fieldId}
                    tabIndex={-1}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
                    className="scrollbar-thin w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
                  >
                    {options.map((option, index) => {
                      const Icon = option.icon
                      const isSelected = option.value === value
                      return (
                        <li
                          key={String(option.value)}
                          id={`${listId}-${index}`}
                          data-index={index}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={option.disabled || undefined}
                          onPointerMove={() => !option.disabled && activeIndex !== index && setActiveIndex(index)}
                          onClick={() => selectIndex(index)}
                          className={cn(
                            'flex cursor-pointer select-none items-start gap-2.5 rounded-md px-2.5 py-2 text-sm',
                            index === activeIndex && 'bg-surface-2',
                            option.disabled && 'cursor-not-allowed opacity-45',
                          )}
                        >
                          {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />}
                          <span className="min-w-0 flex-1">
                            <span className={cn('block truncate', isSelected && 'font-medium')}>{option.label}</span>
                            {option.description && <span className="mt-0.5 block text-xs text-muted">{option.description}</span>}
                          </span>
                          {option.meta && <span className="tabular mt-0.5 shrink-0 text-xs text-muted">{option.meta}</span>}
                          <Check size={15} className={cn('mt-0.5 shrink-0 text-primary', !isSelected && 'invisible')} aria-hidden="true" />
                        </li>
                      )
                    })}
                  </motion.ul>
                </div>
              )}
            </AnimatePresence>
          </Portal>
        </>
      )}
    </Field>
  )
}
