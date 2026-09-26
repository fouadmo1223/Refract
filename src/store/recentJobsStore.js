import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const MAX_JOBS = 20

/**
 * In-session list of recent jobs. Stores metadata only (name, tool, status,
 * timestamp) in sessionStorage — media never leaves memory.
 */
export const useRecentJobsStore = create(
  persist(
    (set) => ({
      jobs: [],
      addJob: (job) =>
        set((state) => ({
          jobs: [{ id: crypto.randomUUID(), timestamp: Date.now(), ...job }, ...state.jobs].slice(0, MAX_JOBS),
        })),
      clearJobs: () => set({ jobs: [] }),
    }),
    {
      name: 'refract:recent-jobs',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
