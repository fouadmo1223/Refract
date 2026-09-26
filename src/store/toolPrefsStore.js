import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Per-user tool preferences in localStorage: the last used tool and custom
 * card orders per list (e.g. "home:popular", "category:image"). Only tool ids
 * are stored — never files.
 */
export const useToolPrefsStore = create(
  persist(
    (set) => ({
      lastUsedId: null,
      orders: {},
      setLastUsed: (id) => set({ lastUsedId: id }),
      setOrder: (listKey, ids) => set((state) => ({ orders: { ...state.orders, [listKey]: ids } })),
      resetOrder: (listKey) =>
        set((state) => {
          const orders = { ...state.orders }
          delete orders[listKey]
          return { orders }
        }),
    }),
    { name: 'refract:tool-prefs', storage: createJSONStorage(() => localStorage) },
  ),
)

/**
 * Apply the saved order for `listKey`, then move the last used tool first.
 * Tools not in the saved order (e.g. newly added ones) keep their default position at the end.
 */
export function useOrderedTools(listKey, tools) {
  const savedOrder = useToolPrefsStore((state) => state.orders[listKey])
  const lastUsedId = useToolPrefsStore((state) => state.lastUsedId)

  return useMemo(() => {
    let ordered = tools
    if (savedOrder?.length) {
      const rank = new Map(savedOrder.map((id, index) => [id, index]))
      ordered = [...tools].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
    }
    const lastUsed = ordered.find((tool) => tool.id === lastUsedId)
    return lastUsed ? [lastUsed, ...ordered.filter((tool) => tool !== lastUsed)] : ordered
  }, [lastUsedId, savedOrder, tools])
}
