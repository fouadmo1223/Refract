import { create } from 'zustand'

/** Ephemeral UI state shared between distant components (header ↔ palette). */
export const useUiStore = create((set) => ({
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}))
