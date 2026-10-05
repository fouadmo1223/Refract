import { useCallback, useEffect, useState } from 'react'

const makeItems = (count) => Array.from({ length: count }, (_, index) => ({ id: `p${index}`, index, rotation: 0 }))

/** Editable page list for a PDF: order, extra rotation, deletion and selection. */
export function usePageItems(pageCount) {
  const [items, setItems] = useState(() => makeItems(pageCount ?? 0))
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    setItems(makeItems(pageCount ?? 0))
    setSelected(new Set())
  }, [pageCount])

  const toggle = useCallback(
    (id) =>
      setSelected((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )

  return {
    items,
    setItems,
    selected,
    setSelected,
    toggle,
    selectAll: () => setSelected(new Set(items.map((item) => item.id))),
    selectNone: () => setSelected(new Set()),
    rotate: (id, delta = 90) => setItems((current) => current.map((item) => (item.id === id ? { ...item, rotation: (item.rotation + delta + 360) % 360 } : item))),
    rotateAll: (delta) => setItems((current) => current.map((item) => ({ ...item, rotation: (item.rotation + delta + 360) % 360 }))),
    remove: (id) => setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current)),
    reverse: () => setItems((current) => [...current].reverse()),
    reset: () => setItems(makeItems(pageCount ?? 0)),
  }
}
