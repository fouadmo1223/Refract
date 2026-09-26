import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

/**
 * Per-tool settings kept in memory for the session so values like
 * "quality = 78" survive new uploads, "process another" and navigation.
 * A future "saved presets" feature can persist snapshots of this map.
 */
const useToolSettingsStore = create((set) => ({
  settings: {},
  patch: (toolId, partial) =>
    set((state) => ({
      settings: { ...state.settings, [toolId]: { ...state.settings[toolId], ...partial } },
    })),
  reset: (toolId) =>
    set((state) => {
      const next = { ...state.settings }
      delete next[toolId]
      return { settings: next }
    }),
}))

/**
 * @returns {[object, (partial: object) => void, () => void]}
 */
export function useToolSettings(toolId, defaults) {
  const stored = useToolSettingsStore((state) => state.settings[toolId])
  const patch = useToolSettingsStore((state) => state.patch)
  const reset = useToolSettingsStore((state) => state.reset)

  // `defaults` must be a stable (module-level) object.
  const settings = useMemo(() => (stored ? { ...defaults, ...stored } : defaults), [stored, defaults])
  const update = useCallback((partial) => patch(toolId, partial), [patch, toolId])
  const resetSettings = useCallback(() => reset(toolId), [reset, toolId])
  return [settings, update, resetSettings]
}
