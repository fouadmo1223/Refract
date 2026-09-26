import { AppError, ERROR_CODES } from '@/lib/errors'
import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, copyFormatFor, encodeArgsFor, even, reencodeFormatFor, seconds } from './encodingArgs'

/** Shared: filter_complex re-encode that keeps audio when present. */
function runComplexFilter(file, graph, meta, { onProgress, signal, expectedDuration, audioFilter } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  return runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-filter_complex', graph, '-map', '[v]', '-map', '0:a?', ...(audioFilter ? ['-af', audioFilter] : []), ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: expectedDuration ?? meta?.duration,
    onProgress,
    signal,
  }).then((blob) => ({ blob, format }))
}

// ------------------------------------------------------------------ Filters
/** FFmpeg filter chains for each look (null = no look). */
export const VIDEO_LOOKS = {
  none: null,
  vivid: 'eq=saturation=1.4:contrast=1.08',
  warm: 'colorbalance=rs=0.08:gs=0.02:bs=-0.08:rm=0.06:bm=-0.06',
  cool: 'colorbalance=rs=-0.08:bs=0.1:rm=-0.05:bm=0.08',
  vintage: 'curves=preset=vintage,vignette=PI/5',
  fade: 'eq=contrast=0.82:brightness=0.04:saturation=0.8',
  noir: 'hue=s=0,eq=contrast=1.35,vignette=PI/5',
  mono: 'hue=s=0',
  sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  dramatic: 'eq=contrast=1.35:saturation=1.15,vignette=PI/6',
}

/** Approximate CSS filters for the live <video> preview (the export uses FFmpeg). */
export const VIDEO_LOOK_PREVIEW = {
  none: '',
  vivid: 'saturate(1.4) contrast(1.08)',
  warm: 'sepia(0.18) saturate(1.1)',
  cool: 'hue-rotate(-12deg) saturate(0.95)',
  vintage: 'sepia(0.35) contrast(0.95) saturate(0.85)',
  fade: 'contrast(0.82) brightness(1.04) saturate(0.8)',
  noir: 'grayscale(1) contrast(1.35)',
  mono: 'grayscale(1)',
  sepia: 'sepia(1)',
  dramatic: 'contrast(1.35) saturate(1.15)',
}

/**
 * @param {{ look: string, brightness: number, contrast: number, saturation: number }} settings
 *   brightness/contrast/saturation are -100…100
 */
export function videoFilterChain({ look, brightness, contrast, saturation }) {
  const filters = []
  if (VIDEO_LOOKS[look]) filters.push(VIDEO_LOOKS[look])
  if (brightness || contrast || saturation) {
    filters.push(`eq=brightness=${(brightness / 100) * 0.3}:contrast=${1 + (contrast / 100) * 0.6}:saturation=${Math.max(0, 1 + saturation / 100)}`)
  }
  return filters.join(',') || 'null'
}

export async function applyVideoFilters(file, settings, meta, options) {
  const result = await runComplexFilter(file, `[0:v]${videoFilterChain(settings)},format=yuv420p[v]`, meta, options)
  return { ...result, width: meta?.width, height: meta?.height, duration: meta?.duration }
}

// ------------------------------------------------------------------ Censor
/**
 * Blur or pixelate rectangular regions for the whole video.
 * @param {{ regions: {x,y,width,height}[], mode: 'blur'|'pixelate'|'solid', strength: number }} settings
 */
export const DEFAULT_CENSOR_AREA = { mode: 'blur', strength: 60, color: '#000000', shape: 'rect', start: 0, end: null }

/** FFmpeg chain that turns a cropped w×h patch into its censored version. */
function censorEffect(area, w, h) {
  const size = Math.min(w, h)
  const strength = area.strength ?? 60
  if (area.mode === 'solid') return `drawbox=x=0:y=0:w=iw:h=ih:color=${(area.color ?? '#000000').replace('#', '0x')}:t=fill`
  if (area.mode === 'pixelate') {
    const block = Math.max(4, Math.round((strength / 100) * size * 0.25))
    return `scale=iw/${block}:-2:flags=neighbor,scale=${w}:${h}:flags=neighbor`
  }
  return `boxblur=${Math.max(2, Math.min(Math.floor(size / 2) - 1, Math.round((strength / 100) * size * 0.18)))}:3`
}

// Ellipse mask: keep pixels inside the inscribed ellipse (X/Y/W/H are per plane, so it works on subsampled chroma).
const ELLIPSE_MASK = "format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(lte(pow(2*X/W-1,2)+pow(2*Y/H-1,2),1),255,0)'"

/**
 * Hide areas of a video. Every area carries its own effect, strength, color,
 * shape and optional time range ({ start, end } in seconds, end null = to the end).
 */
export async function censorVideo(file, { regions }, meta, options) {
  const duration = meta?.duration ?? Infinity
  const valid = regions.filter((region) => region.width >= 4 && region.height >= 4)
  if (!valid.length) throw new AppError(ERROR_CODES.INVALID_CROP)
  const parts = [`[0:v]split=${valid.length + 1}[base]${valid.map((_, index) => `[c${index}]`).join('')}`]
  let current = 'base'
  valid.forEach((region, index) => {
    const area = { ...DEFAULT_CENSOR_AREA, ...region }
    const w = even(region.width)
    const h = even(region.height)
    const x = Math.max(0, Math.round(region.x))
    const y = Math.max(0, Math.round(region.y))
    const effect = [censorEffect(area, w, h), area.shape === 'ellipse' ? ELLIPSE_MASK : null].filter(Boolean).join(',')
    const start = Math.max(0, area.start ?? 0)
    const end = area.end == null ? null : Math.min(duration, area.end)
    const timed = start > 0.01 || (end != null && end < duration - 0.01)
    const enable = timed ? `:enable='between(t,${seconds(start)},${seconds(end ?? duration)})'` : ''
    const next = index === valid.length - 1 ? 'vout' : `v${index}`
    parts.push(`[c${index}]crop=${w}:${h}:${x}:${y},${effect}[b${index}]`)
    parts.push(`[${current}][b${index}]overlay=${x}:${y}${enable}[${next}]`)
    current = next
  })
  parts.push('[vout]format=yuv420p[v]')
  const result = await runComplexFilter(file, parts.join(';'), meta, options)
  return { ...result, width: meta?.width, height: meta?.height, duration: meta?.duration }
}

// ------------------------------------------------------------------ Fit to aspect
export const FIT_SIZES = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
}

/**
 * Place the whole video inside a new aspect ratio without cropping, over a
 * blurred copy of itself (or a solid color) — the standard Reels/TikTok look.
 * @param {{ aspect: string, background: 'blur'|'color', color: string, resolution: 'hd'|'sd' }} settings
 */
export async function fitVideoToAspect(file, { aspect, background, color, resolution }, meta, options) {
  const base = FIT_SIZES[aspect] ?? FIT_SIZES['9:16']
  const factor = resolution === 'sd' ? 2 / 3 : 1
  const width = even(base.width * factor)
  const height = even(base.height * factor)
  const graph =
    background === 'color'
      ? `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${color.replace('#', '0x')},setsar=1,format=yuv420p[v]`
      : `[0:v]split[a][b];[a]scale=${width / 4}:${height / 4}:force_original_aspect_ratio=increase,crop=${width / 4}:${height / 4},boxblur=12:2,scale=${width}:${height}[bg];[b]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]`
  const result = await runComplexFilter(file, graph, meta, options)
  return { ...result, width, height, duration: meta?.duration }
}

// ------------------------------------------------------------------ Fade
/** Fade video (and optionally audio) in from / out to black. */
export async function fadeVideo(file, { fadeIn, fadeOut, fadeAudio }, meta, options) {
  const duration = meta?.duration
  if (!duration || fadeIn + fadeOut > duration) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  const video = []
  const audio = []
  if (fadeIn > 0) {
    video.push(`fade=t=in:st=0:d=${seconds(fadeIn)}`)
    audio.push(`afade=t=in:st=0:d=${seconds(fadeIn)}`)
  }
  if (fadeOut > 0) {
    video.push(`fade=t=out:st=${seconds(duration - fadeOut)}:d=${seconds(fadeOut)}`)
    audio.push(`afade=t=out:st=${seconds(duration - fadeOut)}:d=${seconds(fadeOut)}`)
  }
  const graph = `[0:v]${video.join(',') || 'null'},format=yuv420p[v]`
  const result = await runComplexFilter(file, graph, meta, { ...options, audioFilter: fadeAudio && audio.length ? audio.join(',') : undefined })
  return { ...result, width: meta?.width, height: meta?.height, duration }
}

// ------------------------------------------------------------------ Split
export const MAX_SPLIT_PARTS = 50

/**
 * Split into equal parts or fixed-length segments. Uses stream copy, so it's
 * fast and lossless; cut points snap to keyframes.
 * @param {{ mode: 'parts'|'length', parts: number, length: number }} settings
 */
export async function splitVideo(file, { mode, parts, length }, meta, { onProgress, signal } = {}) {
  const duration = meta?.duration
  const segment = mode === 'parts' ? duration / parts : length
  if (!duration || !(segment > 0.5) || Math.ceil(duration / segment) > MAX_SPLIT_PARTS) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  const format = copyFormatFor(file)
  const pattern = `part_%03d.${format}`
  const segments = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-map', '0', '-c', 'copy', '-f', 'segment', '-segment_time', seconds(segment), '-reset_timestamps', '1', pattern],
    output: pattern,
    outputType: OUTPUT_TYPES[format],
    collectPrefix: 'part_',
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { parts: segments, format, segmentLength: segment }
}
