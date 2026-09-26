import { probeMedia, runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, even, h264Args, aacArgs, seconds } from './encodingArgs'

export const MERGE_SIZES = {
  first: null,
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
}

export const MERGE_TRANSITIONS = ['none', 'fade', 'fadeblack', 'fadewhite', 'wipeleft', 'slideleft', 'circleopen', 'dissolve']

export const DEFAULT_MERGE = { size: 'first', fit: 'pad', background: '#000000', transition: 'none', transitionDuration: 0.5, keepAudio: true }

/**
 * Merge clips in order. Every clip is scaled to one frame size (the first
 * clip's, or a preset) by padding or cropping, at 30 fps. Optional xfade
 * transitions (with matching audio crossfades) blend each cut. Audio is kept
 * only when every clip has an audio track (reported via `audioDropped`).
 */
export async function mergeVideos(files, settings = {}, { onProgress, signal } = {}) {
  const s = { ...DEFAULT_MERGE, ...settings }
  onProgress?.(null, 'analyzing')
  const probes = []
  for (const file of files) probes.push(await probeMedia(file, { signal }))
  const preset = MERGE_SIZES[s.size]
  const width = even(preset?.width ?? (probes[0].width || 1280))
  const height = even(preset?.height ?? (probes[0].height || 720))
  const anyAudio = probes.some((probe) => probe.hasAudio)
  const withAudio = s.keepAudio && probes.every((probe) => probe.hasAudio)
  const durations = probes.map((probe) => probe.duration ?? 0)
  const pad = s.background.replace('#', '0x')
  const fitFilter =
    s.fit === 'crop'
      ? `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
      : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${pad}`

  const filters = probes.map(
    (_, index) =>
      `[${index}:v]${fitFilter},setsar=1,fps=30,format=yuv420p,settb=AVTB[v${index}]` +
      (withAudio ? `;[${index}:a]aresample=44100,aformat=channel_layouts=stereo[a${index}]` : ''),
  )

  // Transitions can't be longer than the shortest clip allows.
  const fade = Math.min(s.transitionDuration, ...durations.map((value) => Math.max(0.1, value / 2 - 0.05)))
  const useTransitions = s.transition !== 'none' && files.length > 1 && durations.every((value) => value > 0.3)
  let graph
  let totalDuration = durations.reduce((sum, value) => sum + value, 0)
  if (useTransitions) {
    const steps = []
    let videoLabel = 'v0'
    let audioLabel = 'a0'
    let offset = 0
    for (let index = 1; index < files.length; index += 1) {
      offset += durations[index - 1] - fade
      const nextVideo = index === files.length - 1 ? 'v' : `vx${index}`
      steps.push(`[${videoLabel}][v${index}]xfade=transition=${s.transition}:duration=${seconds(fade)}:offset=${seconds(offset)}[${nextVideo}]`)
      videoLabel = nextVideo
      if (withAudio) {
        const nextAudio = index === files.length - 1 ? 'a' : `ax${index}`
        steps.push(`[${audioLabel}][a${index}]acrossfade=d=${seconds(fade)}[${nextAudio}]`)
        audioLabel = nextAudio
      }
    }
    totalDuration -= fade * (files.length - 1)
    graph = `${filters.join(';')};${steps.join(';')}`
  } else {
    const concatInputs = probes.map((_, index) => (withAudio ? `[v${index}][a${index}]` : `[v${index}]`)).join('')
    graph = `${filters.join(';')};${concatInputs}concat=n=${files.length}:v=1:a=${withAudio ? 1 : 0}[v]${withAudio ? '[a]' : ''}`
  }

  const output = 'output.mp4'
  const blob = await runFFmpeg({
    inputs: files.map((file) => ({ file })),
    buildArgs: (inputs) => [
      ...inputs.flatMap((input) => ['-i', input]),
      '-filter_complex', graph,
      '-map', '[v]', ...(withAudio ? ['-map', '[a]'] : []),
      ...h264Args(), ...(withAudio ? aacArgs(160) : []),
      '-movflags', '+faststart', output,
    ],
    output,
    outputType: OUTPUT_TYPES.mp4,
    expectedDuration: totalDuration || undefined,
    onProgress,
    signal,
  })
  return { blob, format: 'mp4', width, height, duration: totalDuration, audioDropped: s.keepAudio && !withAudio && anyAudio }
}
