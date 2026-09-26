import { create } from 'zustand'

const STORAGE_KEY = 'refract:ai-keys'

/**
 * API keys for cloud AI providers, entered by the user.
 * By default keys live in sessionStorage (cleared when the tab closes);
 * "Remember on this device" moves them to localStorage. Keys are only ever
 * sent to the provider they belong to, in an Authorization header.
 */
function readInitial() {
  try {
    const local = localStorage.getItem(STORAGE_KEY)
    if (local) return { keys: JSON.parse(local), remember: true }
    const session = sessionStorage.getItem(STORAGE_KEY)
    if (session) return { keys: JSON.parse(session), remember: false }
  } catch {
    /* storage unavailable (private mode) — keep keys in memory only */
  }
  return { keys: {}, remember: false }
}

function persist({ keys, remember }) {
  try {
    const hasKeys = Object.values(keys).some(Boolean)
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (!hasKeys) return
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

export const useAiKeysStore = create((set, get) => ({
  ...readInitial(),
  setKey: (providerId, key) => {
    const next = { ...get().keys, [providerId]: key.trim() }
    set({ keys: next })
    persist({ keys: next, remember: get().remember })
  },
  setRemember: (remember) => {
    set({ remember })
    persist({ keys: get().keys, remember })
  },
  clearKey: (providerId) => {
    const next = { ...get().keys }
    delete next[providerId]
    set({ keys: next })
    persist({ keys: next, remember: get().remember })
  },
}))
