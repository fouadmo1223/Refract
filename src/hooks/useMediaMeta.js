import { useQuery } from '@tanstack/react-query'

const fileIds = new WeakMap()
let nextId = 0

/** Stable identity for a File/Blob across renders (for query keys). */
export function getBlobId(blob) {
  if (!blob) return null
  if (!fileIds.has(blob)) fileIds.set(blob, ++nextId)
  return fileIds.get(blob)
}

/**
 * Async, cached derived data for a file (dimensions, duration, EXIF…).
 * React Query handles loading / error states and de-duplication; results are
 * dropped as soon as no component uses them (gcTime 0) so media memory isn't retained.
 */
export function useMediaMeta(file, loader, { key = 'meta', enabled = true } = {}) {
  return useQuery({
    queryKey: ['media', key, getBlobId(file)],
    queryFn: () => loader(file),
    enabled: Boolean(file && loader && enabled),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })
}
