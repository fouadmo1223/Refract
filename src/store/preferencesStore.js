import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n, { PREFERENCES_STORAGE_KEY } from '@/i18n'

/**
 * User preferences persisted to localStorage.
 * Only safe, tiny values live here — never media.
 */
export const usePreferencesStore = create(
  persist(
    (set) => ({
      theme: 'system', // 'light' | 'dark' | 'system'
      language: i18n.language ?? 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        i18n.changeLanguage(language)
        set({ language })
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, language }) => ({ theme, language }),
    },
  ),
)
