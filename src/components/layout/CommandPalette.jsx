import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getPopularTools } from '@/constants/tools'
import { searchTools } from '@/lib/searchTools'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useHotkey } from '@/hooks/useHotkey'
import { useUiStore } from '@/store/uiStore'
import { Kbd } from '@/components/ui/misc'
import { Portal } from '@/components/ui/Portal'
import i18n from '@/i18n'

const tEn = i18n.getFixedT('en')

/**
 * ⌘K / Ctrl+K tool search. Combobox + listbox semantics; arrows move,
 * Enter opens, Escape closes. Searches both languages.
 */
export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const open = useUiStore((state) => state.commandPaletteOpen)
  const openPalette = useUiStore((state) => state.openCommandPalette)
  const closePalette = useUiStore((state) => state.closeCommandPalette)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const deferredQuery = useDeferredValue(query)
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()
  useFocusTrap(panelRef, open, inputRef)

  useHotkey('mod+k', () => (open ? closePalette() : openPalette()), { allowInInputs: true })

  const results = useMemo(() => (deferredQuery.trim() ? searchTools(deferredQuery, t, tEn) : getPopularTools()), [deferredQuery, t])

  useEffect(() => setActiveIndex(0), [deferredQuery])
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const openTool = (tool) => {
    closePalette()
    navigate(tool.path)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(results.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      openTool(results[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closePalette()
    }
  }

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[8vh] sm:pt-[14vh]">
            <motion.div
              className="fixed inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closePalette}
              aria-hidden="true"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('search.title')}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('search.placeholder')}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                  aria-autocomplete="list"
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-faint"
                />
                <Kbd>Esc</Kbd>
              </div>
              <div className="px-2 pb-1 pt-2">
                <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted">
                  {query.trim() ? t('search.results', { count: results.length }) : t('search.popular')}
                </p>
              </div>
              <ul ref={listRef} id={listId} role="listbox" aria-label={t('search.title')} className="scrollbar-thin max-h-[52vh] overflow-y-auto px-2 pb-2">
                {results.length === 0 && (
                  <li className="px-3 py-8 text-center text-sm text-muted" role="presentation">
                    {t('search.noResults', { query })}
                  </li>
                )}
                {results.map((tool, index) => {
                  const Icon = tool.icon
                  const active = index === activeIndex
                  return (
                    <li
                      key={tool.id}
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={active}
                      onPointerMove={() => activeIndex !== index && setActiveIndex(index)}
                      onClick={() => openTool(tool)}
                      className={cn('flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2', active && 'bg-surface-2')}
                    >
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset', active ? 'bg-primary-soft text-primary-soft-fg ring-transparent' : 'bg-surface-2 text-text-2 ring-border')}>
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">{t(`tools.${tool.id}.title`)}</span>
                        <span className="block truncate text-xs text-muted">{t(`tools.${tool.id}.short`)}</span>
                      </span>
                      <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-faint">{t(`categories.${tool.category}.short`)}</span>
                      {active ? <CornerDownLeft size={14} className="shrink-0 text-muted rtl:-scale-x-100" aria-hidden="true" /> : <ArrowRight size={14} className="shrink-0 text-transparent" aria-hidden="true" />}
                    </li>
                  )
                })}
              </ul>
              <div className="hidden items-center gap-4 border-t border-border bg-surface-2 px-4 py-2 text-2xs text-muted sm:flex">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  {t('search.navigate')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd>
                  {t('search.open')}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}
