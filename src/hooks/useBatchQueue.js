import { useCallback, useEffect, useReducer, useRef } from 'react'
import { createFileId } from '@/lib/files'
import { isCanceled, normalizeError } from '@/lib/errors'

const CONCURRENCY = 2

function reducer(items, action) {
  switch (action.type) {
    case 'add':
      return [...items, ...action.files.map((file) => ({ id: createFileId(file), file, status: 'idle', progress: 0, result: null, error: null, job: null }))]
    case 'patch':
      return items.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item))
    case 'reset':
      // Back to idle so finished files can be processed again with new settings.
      return items.map((item) => (item.status === 'processing' || item.status === 'waiting' ? item : { ...item, status: 'idle', progress: 0, result: null, error: null }))
    case 'queue':
      // `job` may be a function of the item, so every file can carry its own settings.
      return items.map((item) =>
        action.statuses.includes(item.status) && (!action.ids || action.ids.includes(item.id))
          ? { ...item, status: 'waiting', progress: 0, error: null, job: typeof action.job === 'function' ? action.job(item) : action.job }
          : item,
      )
    case 'remove':
      return items.filter((item) => item.id !== action.id)
    case 'clear':
      return []
    default:
      return items
  }
}

/**
 * Batch queue with bounded concurrency. Each item captures the job settings
 * at queue time, so editing settings never affects work already running.
 *
 * @param {(file: File, job: object, ctx: { signal, onProgress }) => Promise<object>} processItem
 */
export function useBatchQueue(processItem) {
  const [items, dispatch] = useReducer(reducer, [])
  const controllers = useRef(new Map())
  const processRef = useRef(processItem)
  processRef.current = processItem

  const runItem = useCallback(async (item) => {
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    dispatch({ type: 'patch', id: item.id, patch: { status: 'processing', progress: 0 } })
    try {
      const result = await processRef.current(item.file, item.job, {
        signal: controller.signal,
        onProgress: (value) => dispatch({ type: 'patch', id: item.id, patch: { progress: value ?? 0 } }),
      })
      if (!controller.signal.aborted) dispatch({ type: 'patch', id: item.id, patch: { status: 'completed', progress: 1, result } })
    } catch (error) {
      if (isCanceled(error) || controller.signal.aborted) dispatch({ type: 'patch', id: item.id, patch: { status: 'canceled', progress: 0 } })
      else dispatch({ type: 'patch', id: item.id, patch: { status: 'failed', error: normalizeError(error) } })
    } finally {
      controllers.current.delete(item.id)
    }
  }, [])

  // Pump: whenever the list changes, start waiting items up to the concurrency limit.
  useEffect(() => {
    const free = CONCURRENCY - controllers.current.size
    if (free <= 0) return
    items
      .filter((item) => item.status === 'waiting' && !controllers.current.has(item.id))
      .slice(0, free)
      .forEach(runItem)
  }, [items, runItem])

  // Abort everything on unmount.
  useEffect(() => {
    const active = controllers.current
    return () => active.forEach((controller) => controller.abort())
  }, [])

  const cancelItem = useCallback((id) => {
    const controller = controllers.current.get(id)
    if (controller) controller.abort()
    else dispatch({ type: 'patch', id, patch: { status: 'canceled' } })
  }, [])

  return {
    items,
    addFiles: useCallback((files) => dispatch({ type: 'add', files }), []),
    startAll: useCallback((job) => dispatch({ type: 'queue', statuses: ['idle', 'failed', 'canceled'], job }), []),
    retryItem: useCallback((id, job) => dispatch({ type: 'queue', statuses: ['failed', 'canceled'], ids: [id], job }), []),
    retryFailed: useCallback((job) => dispatch({ type: 'queue', statuses: ['failed'], job }), []),
    cancelItem,
    resetAll: useCallback(() => dispatch({ type: 'reset' }), []),
    removeItem: useCallback((id) => {
      controllers.current.get(id)?.abort()
      dispatch({ type: 'remove', id })
    }, []),
    clear: useCallback(() => {
      controllers.current.forEach((controller) => controller.abort())
      dispatch({ type: 'clear' })
    }, []),
  }
}
