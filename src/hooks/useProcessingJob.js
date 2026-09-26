import { useCallback, useEffect, useRef, useState } from 'react'
import { isCanceled, normalizeError } from '@/lib/errors'
import { notify } from '@/lib/notify'
import { useRecentJobsStore } from '@/store/recentJobsStore'

const IDLE = { status: 'idle', progress: null, stage: null, result: null, error: null }

/**
 * Generic lifecycle for one processing run: idle → processing → success | error.
 *
 * `run(task)` receives `{ signal, onProgress }`. `onProgress(value, stage)` accepts a
 * 0–1 ratio (or null for indeterminate) plus an optional stage key.
 * Progress updates are coalesced (~15/s) to avoid re-render storms. A timer is used
 * instead of requestAnimationFrame so progress keeps updating in background tabs.
 */
export function useProcessingJob({ toolId, successMessage } = {}) {
  const [state, setState] = useState(IDLE)
  const controllerRef = useRef(null)
  const frameRef = useRef(0)
  const pendingProgressRef = useRef(null)
  const addJob = useRecentJobsStore((store) => store.addJob)

  useEffect(
    () => () => {
      controllerRef.current?.abort()
      clearTimeout(frameRef.current)
    },
    [],
  )

  const flushProgress = useCallback(() => {
    frameRef.current = 0
    const pending = pendingProgressRef.current
    if (!pending) return
    setState((current) => (current.status === 'processing' ? { ...current, ...pending } : current))
  }, [])

  const handleProgress = useCallback(
    (value, stage) => {
      const progress = value == null ? null : Math.min(1, Math.max(0, value))
      pendingProgressRef.current = { progress, ...(stage ? { stage } : {}) }
      if (!frameRef.current) frameRef.current = setTimeout(flushProgress, 66)
    },
    [flushProgress],
  )

  const run = useCallback(
    async (task, { fileName, initialStage = 'processing' } = {}) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setState({ ...IDLE, status: 'processing', stage: initialStage })

      try {
        const result = await task({ signal: controller.signal, onProgress: handleProgress })
        if (controller.signal.aborted) return null
        clearTimeout(frameRef.current)
        frameRef.current = 0
        setState({ ...IDLE, status: 'success', progress: 1, result })
        if (successMessage) notify.success(successMessage)
        if (toolId) addJob({ toolId, fileName, status: 'completed' })
        return result
      } catch (error) {
        if (isCanceled(error) || controller.signal.aborted) {
          setState(IDLE)
          if (toolId) addJob({ toolId, fileName, status: 'canceled' })
          return null
        }
        const normalized = normalizeError(error)
        setState({ ...IDLE, status: 'error', error: normalized })
        notify.error(normalized)
        if (toolId) addJob({ toolId, fileName, status: 'failed' })
        return null
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [addJob, handleProgress, successMessage, toolId],
  )

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  return { ...state, run, cancel, reset, isProcessing: state.status === 'processing' }
}
