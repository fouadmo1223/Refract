import { create } from 'zustand'

/**
 * Hands a file from one screen to another (e.g. home uploader → chosen tool)
 * without serializing it. The receiving tool consumes and clears it.
 */
export const usePendingFileStore = create((set, get) => ({
  file: null,
  setPendingFile: (file) => set({ file }),
  takePendingFile: () => {
    const { file } = get()
    if (file) set({ file: null })
    return file
  },
}))
