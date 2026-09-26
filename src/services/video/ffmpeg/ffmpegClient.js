import { AppError, ERROR_CODES, createCanceledError, isAppError, throwIfAborted } from '@/lib/errors'

/**
 * FFmpeg.wasm engine wrapper.
 *
 * - Lazy: FFmpeg (≈30 MB of WebAssembly) is only downloaded when a video tool
 *   actually runs a job. Assets are bundled with the app — nothing is fetched
 *   from third-party CDNs, and media never leaves the browser.
 * - Serialized: FFmpeg can run one command at a time, so jobs are queued.
 * - Cancelable: aborting terminates the worker; the next job reloads the engine.
 * - Zero-copy input: files are mounted with WORKERFS instead of being copied
 *   into WebAssembly memory, which keeps large videos within memory limits.
 * - Real progress: parsed from FFmpeg's `time=` log output against the
 *   expected output duration.
 */

let ffmpegInstance = null
let loadPromise = null
let queue = Promise.resolve()
let jobCounter = 0

function parseTimestamp(text) {
  const match = text.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null
}

export function isFFmpegSupported() {
  return typeof WebAssembly === 'object' && typeof Worker !== 'undefined'
}

async function loadFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  if (!loadPromise) {
    loadPromise = (async () => {
      if (!isFFmpegSupported()) throw new AppError(ERROR_CODES.BROWSER_UNSUPPORTED)
      try {
        const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
          import('@ffmpeg/ffmpeg'),
          import('@ffmpeg/core?url'),
          import('@ffmpeg/core/wasm?url'),
        ])
        const ffmpeg = new FFmpeg()
        await ffmpeg.load({ coreURL, wasmURL })
        ffmpegInstance = ffmpeg
        return ffmpeg
      } catch (error) {
        loadPromise = null
        if (isAppError(error)) throw error
        throw new AppError(ERROR_CODES.FFMPEG_INIT_FAILED, {}, error)
      }
    })()
  }
  return loadPromise
}

/** Warm up the engine in the background (e.g. when a video tool page opens). */
export function preloadFFmpeg() {
  return loadFFmpeg().catch(() => {})
}

function resetEngine() {
  try {
    ffmpegInstance?.terminate()
  } catch {
    /* already terminated */
  }
  ffmpegInstance = null
  loadPromise = null
}

function classifyFailure(logs) {
  const text = logs.join('\n').toLowerCase()
  if (/out of memory|cannot enlarge memory|memory access out of bounds|abort\(oom\)/.test(text)) return ERROR_CODES.OUT_OF_MEMORY
  if (/invalid data found|moov atom not found|could not find codec parameters|error while decoding/.test(text)) return ERROR_CODES.CORRUPTED_FILE
  if (/matches no streams|does not contain any stream|stream map .* matches no streams/.test(text)) return ERROR_CODES.NO_AUDIO_STREAM
  return ERROR_CODES.CONVERSION_FAILED
}

function withQueue(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

/**
 * Run an FFmpeg command.
 *
 * @param {object} job
 * @param {{ file: Blob, name?: string }[]} job.inputs
 * @param {(inputPaths: string[]) => string[]} job.buildArgs receives mounted input paths; must write to `job.output`
 * @param {string} job.output output file name, e.g. "output.mp4"
 * @param {string} [job.outputType] MIME type of the result
 * @param {number} [job.expectedDuration] seconds of output media, for progress
 * @param {string} [job.collectPrefix] return every output file starting with this prefix (frame extraction)
 * @param {(value: number|null, stage: string) => void} [job.onProgress]
 * @param {AbortSignal} [job.signal]
 * @returns {Promise<Blob | { name: string, blob: Blob }[]>}
 */
export function runFFmpeg(job) {
  return withQueue(async () => {
    const { inputs, buildArgs, output, outputType, expectedDuration, collectPrefix, onProgress, signal } = job
    throwIfAborted(signal)
    onProgress?.(null, 'loadingEngine')
    const ffmpeg = await loadFFmpeg()
    throwIfAborted(signal)

    const jobId = ++jobCounter
    const mountPoint = `/input-${jobId}`
    const workDir = `/work-${jobId}`
    const logs = []
    // Dev aid: inspect the running job's FFmpeg output from the console.
    if (import.meta.env.DEV) globalThis.__ffmpegLogs = logs
    let inputDuration = null
    const targetDuration = () => expectedDuration ?? inputDuration

    const handleLog = ({ message }) => {
      logs.push(message)
      if (logs.length > 400) logs.shift()
      if (inputDuration == null && message.includes('Duration:')) inputDuration = parseTimestamp(message.split('Duration:')[1])
      const timeMatch = message.match(/time=\s*(-?\d+:\d+:\d+(?:\.\d+)?)/)
      const duration = targetDuration()
      if (timeMatch && duration) {
        const seconds = parseTimestamp(timeMatch[1])
        if (seconds != null && seconds >= 0) onProgress?.(Math.min(0.99, seconds / duration), 'encoding')
      }
    }
    const handleProgress = ({ progress }) => {
      // Fallback when duration is unknown: FFmpeg's own ratio (can be noisy, so clamp).
      if (!targetDuration() && Number.isFinite(progress) && progress > 0 && progress <= 1) onProgress?.(progress, 'encoding')
    }

    let aborted = false
    const handleAbort = () => {
      aborted = true
      resetEngine()
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
    ffmpeg.on('log', handleLog)
    ffmpeg.on('progress', handleProgress)

    try {
      await ffmpeg.createDir(mountPoint)
      await ffmpeg.createDir(workDir)
      // Rename inputs to safe unique names; `new File([blob])` wraps without copying bytes.
      const files = inputs.map(({ file, name }, index) => {
        const extension = (name ?? file.name ?? '').split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'
        return new File([file], `in${index}.${extension}`, { type: file.type })
      })
      await ffmpeg.mount('WORKERFS', { files }, mountPoint)
      const inputPaths = files.map((file) => `${mountPoint}/${file.name}`)
      const outputPath = `${workDir}/${output}`

      onProgress?.(0, 'encoding')
      const args = buildArgs(inputPaths).map((arg) => (arg === output ? outputPath : arg))
      const exitCode = await ffmpeg.exec(['-hide_banner', '-y', ...args])
      if (aborted) throw createCanceledError()
      if (exitCode !== 0) throw new AppError(classifyFailure(logs), { exitCode })

      onProgress?.(1, 'finalizing')
      if (collectPrefix) {
        const entries = await ffmpeg.listDir(workDir)
        const names = entries.filter((entry) => !entry.isDir && entry.name.startsWith(collectPrefix)).map((entry) => entry.name).sort()
        const results = []
        for (const name of names) {
          const data = await ffmpeg.readFile(`${workDir}/${name}`)
          results.push({ name, blob: new Blob([data.buffer], { type: outputType }) })
          await ffmpeg.deleteFile(`${workDir}/${name}`)
        }
        if (!results.length) throw new AppError(ERROR_CODES.CONVERSION_FAILED)
        return results
      }
      const data = await ffmpeg.readFile(outputPath)
      if (!data?.length) throw new AppError(ERROR_CODES.CONVERSION_FAILED)
      await ffmpeg.deleteFile(outputPath).catch(() => {})
      return new Blob([data.buffer], { type: outputType })
    } catch (error) {
      if (aborted || signal?.aborted) throw createCanceledError()
      if (isAppError(error)) throw error
      const code = classifyFailure([...logs, String(error?.message ?? error)])
      // A crashed wasm instance can't be reused.
      if (code === ERROR_CODES.OUT_OF_MEMORY) resetEngine()
      throw new AppError(code, {}, error)
    } finally {
      signal?.removeEventListener('abort', handleAbort)
      if (!aborted && ffmpegInstance === ffmpeg) {
        ffmpeg.off('log', handleLog)
        ffmpeg.off('progress', handleProgress)
        await ffmpeg.unmount(mountPoint).catch(() => {})
        await ffmpeg.deleteDir(mountPoint).catch(() => {})
        await ffmpeg.deleteDir(workDir).catch(() => {})
      }
    }
  })
}

/**
 * Probe a media file with FFmpeg (for formats the <video> element can't read,
 * and to detect audio streams). Returns { duration, width, height, fps, hasAudio, hasVideo }.
 */
export function probeMedia(file, { signal } = {}) {
  return withQueue(async () => {
    const ffmpeg = await loadFFmpeg()
    throwIfAborted(signal)
    const jobId = ++jobCounter
    const mountPoint = `/probe-${jobId}`
    const logs = []
    const handleLog = ({ message }) => logs.push(message)
    ffmpeg.on('log', handleLog)
    try {
      await ffmpeg.createDir(mountPoint)
      const safe = new File([file], `probe.${(file.name ?? '').split('.').pop() || 'bin'}`, { type: file.type })
      await ffmpeg.mount('WORKERFS', { files: [safe] }, mountPoint)
      await ffmpeg.exec(['-hide_banner', '-i', `${mountPoint}/${safe.name}`])
    } finally {
      ffmpeg.off('log', handleLog)
      await ffmpeg.unmount(mountPoint).catch(() => {})
      await ffmpeg.deleteDir(mountPoint).catch(() => {})
    }
    const text = logs.join('\n')
    const durationMatch = text.match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/)
    const videoLine = logs.find((line) => /Stream #.*Video:/.test(line)) ?? ''
    const sizeMatch = videoLine.match(/(\d{2,5})x(\d{2,5})/)
    const fpsMatch = videoLine.match(/([\d.]+)\s*fps/)
    return {
      duration: durationMatch ? parseTimestamp(durationMatch[1]) : null,
      width: sizeMatch ? Number(sizeMatch[1]) : null,
      height: sizeMatch ? Number(sizeMatch[2]) : null,
      fps: fpsMatch ? Number(fpsMatch[1]) : null,
      hasVideo: Boolean(videoLine),
      hasAudio: logs.some((line) => /Stream #.*Audio:/.test(line)),
    }
  })
}
