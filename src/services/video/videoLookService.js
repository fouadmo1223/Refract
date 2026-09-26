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

export const VIDEO_ADJUSTMENTS = {
  brightness: [-100, 100],
  contrast: [-100, 100],
  saturation: [-100, 100],
  temperature: [-100, 100],
  hue: [-180, 180],
  sharpen: [0, 100],
  blur: [0, 100],
  vignette: [0, 100],
  grain: [0, 100],
}

/**
 * Look + manual adjustments as one FFmpeg chain. Colour values are -100..100,
 * hue is degrees, detail/texture values are 0..100.
 */
export function videoFilterChain(settings) {
  const { look, brightness = 0, contrast = 0, saturation = 0, temperature = 0, hue = 0, sharpen = 0, blur = 0, vignette = 0, grain = 0 } = settings
  const filters = []
  if (VIDEO_LOOKS[look]) filters.push(VIDEO_LOOKS[look])
  if (brightness || contrast || saturation) {
    filters.push(`eq=brightness=${(brightness / 100) * 0.3}:contrast=${1 + (contrast / 100) * 0.6}:saturation=${Math.max(0, 1 + saturation / 100)}`)
  }
  if (temperature) {
    const warm = (temperature / 100) * 0.18
    const r = warm.toFixed(3)
    const b = (-warm).toFixed(3)
    filters.push(`colorbalance=rs=${r}:bs=${b}:rm=${r}:bm=${b}:rh=${(warm / 2).toFixed(3)}:bh=${(-warm / 2).toFixed(3)}`)
  }
  if (hue) filters.push(`hue=h=${Math.round(hue)}`)
  if (blur > 0) filters.push(`gblur=sigma=${((blur / 100) * 12).toFixed(2)}`)
  if (sharpen > 0) filters.push(`unsharp=5:5:${((sharpen / 100) * 1.6).toFixed(2)}:5:5:0`)
  if (vignette > 0) filters.push(`vignette=angle=${(0.25 + (vignette / 100) * 0.9).toFixed(3)}`)
  if (grain > 0) filters.push(`noise=alls=${Math.round((grain / 100) * 40)}:allf=t`)
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
export async function fitVideoToAspect(file, { aspect, background, color, resolution, blur = 50, scale = 100, position = 'center' }, meta, options) {
  const base = FIT_SIZES[aspect] ?? FIT_SIZES['9:16']
  const factor = resolution === 'sd' ? 2 / 3 : 1
  const width = even(base.width * factor)
  const height = even(base.height * factor)
  // Foreground box (the whole video must fit inside it) and where it sits on the canvas.
  const boxW = even((width * scale) / 100)
  const boxH = even((height * scale) / 100)
  const place = `(W-w)/2:${position === 'top' ? '0' : position === 'bottom' ? 'H-h' : '(H-h)/2'}`
  const radius = Math.max(1, Math.round(2 + (blur / 100) * 22))
  const graph =
    background === 'color'
      ? `color=c=${color.replace('#', '0x')}:s=${width}x${height}[bg];[0:v]scale=${boxW}:${boxH}:force_original_aspect_ratio=decrease,setsar=1[fg];[bg][fg]overlay=${place}:shortest=1,format=yuv420p[v]`
      : `[0:v]split[a][b];[a]scale=${width / 4}:${height / 4}:force_original_aspect_ratio=increase,crop=${width / 4}:${height / 4},boxblur=${Math.min(radius, Math.floor(Math.min(width, height) / 16) - 1)}:2,scale=${width}:${height}[bg];[b]scale=${boxW}:${boxH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=${place},setsar=1,format=yuv420p[v]`
  const result = await runComplexFilter(file, graph, meta, options)
  return { ...result, width, height, duration: meta?.duration }
}

// ------------------------------------------------------------------ Fade
export const FADE_STYLES = ['black', 'white', 'color', 'blur']
export const AUDIO_CURVES = { linear: 'tri', smooth: 'qsin', easeIn: 'exp', easeOut: 'log' }

export const DEFAULT_FADE = {
  fadeIn: 1,
  fadeOut: 1,
  inStyle: 'black',
  outStyle: 'black',
  inColor: '#000000',
  outColor: '#000000',
  fadeAudio: true,
  audioCurve: 'smooth',
}

/** How much of the fade effect is visible at `time` (0 = clear picture, 1 = fully faded) and which side is active. */
export function fadeAmountAt(time, { fadeIn, fadeOut }, duration) {
  if (fadeIn > 0 && time < fadeIn) return { amount: 1 - time / fadeIn, side: 'in' }
  if (fadeOut > 0 && time > duration - fadeOut) return { amount: Math.min(1, (time - (duration - fadeOut)) / fadeOut), side: 'out' }
  return { amount: 0, side: null }
}

export const fadeColorFor = (style, color) => (style === 'white' ? '#FFFFFF' : style === 'black' ? '#000000' : color)

/**
 * One fade side as a filter step. Colour fades use the native `fade`; blur fades
 * overlay a blurred copy whose alpha fades, blurring only inside the window.
 */
function fadeStep({ side, start, length, style, color, label, next, meta }) {
  if (style !== 'blur') {
    return `[${label}]fade=t=${side}:st=${seconds(start)}:d=${seconds(length)}:color=${fadeColorFor(style, color).replace('#', '0x')}[${next}]`
  }
  const size = Math.min(meta?.width || 640, meta?.height || 360)
  const radius = Math.max(2, Math.round(size / 30))
  const window = `between(t,${seconds(Math.max(0, start - 0.1))},${seconds(start + length + 0.1)})`
  // Fade in: blurred copy starts opaque and fades away; fade out: it fades in.
  const alphaFade = `fade=t=${side === 'in' ? 'out' : 'in'}:st=${seconds(start)}:d=${seconds(length)}:alpha=1`
  return (
    `[${label}]split[${next}a][${next}b];` +
    `[${next}b]boxblur=luma_radius=${radius}:luma_power=2:chroma_radius=${Math.max(1, Math.round(radius / 2))}:chroma_power=2:enable='${window}',format=yuva420p,${alphaFade}[${next}t];` +
    `[${next}a][${next}t]overlay=format=auto[${next}]`
  )
}

/** Fade in and/or out, each with its own style (black, white, colour or blur), plus curved audio fades. */
export async function fadeVideo(file, settings, meta, options) {
  const s = { ...DEFAULT_FADE, ...settings }
  const duration = meta?.duration
  if (!duration || s.fadeIn + s.fadeOut > duration) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  const steps = []
  const audio = []
  const audioCurve = AUDIO_CURVES[s.audioCurve] ?? 'tri'
  let label = 'pre'
  if (s.fadeIn > 0) {
    steps.push(fadeStep({ side: 'in', start: 0, length: s.fadeIn, style: s.inStyle, color: s.inColor, label, next: 'fin', meta }))
    label = 'fin'
    audio.push(`afade=t=in:st=0:d=${seconds(s.fadeIn)}:curve=${audioCurve}`)
  }
  if (s.fadeOut > 0) {
    const start = duration - s.fadeOut
    steps.push(fadeStep({ side: 'out', start, length: s.fadeOut, style: s.outStyle, color: s.outColor, label, next: 'fout', meta }))
    label = 'fout'
    audio.push(`afade=t=out:st=${seconds(start)}:d=${seconds(s.fadeOut)}:curve=${audioCurve}`)
  }
  const graph = [`[0:v]format=yuv420p[pre]`, ...steps, `[${label}]format=yuv420p[v]`].join(';')
  const result = await runComplexFilter(file, graph, meta, { ...options, audioFilter: s.fadeAudio && audio.length ? audio.join(',') : undefined })
  return { ...result, width: meta?.width, height: meta?.height, duration }
}

// ------------------------------------------------------------------ Split
export const MAX_SPLIT_PARTS = 50

/**
 * Split into equal parts or fixed-length segments. Uses stream copy, so it's
 * fast and lossless; cut points snap to keyframes.
 * @param {{ mode: 'parts'|'length'|'times', parts: number, length: number, times?: number[], precise?: boolean }} settings
 */
export async function splitVideo(file, { mode, parts, length, times = [], precise = false }, meta, { onProgress, signal } = {}) {
  const duration = meta?.duration
  if (!duration) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  let cutArgs
  let segment
  if (mode === 'times') {
    const cuts = [...new Set(times.filter((time) => time > 0.2 && time < duration - 0.2).map((time) => Number(time.toFixed(3))))].sort((a, b) => a - b)
    if (!cuts.length || cuts.length + 1 > MAX_SPLIT_PARTS) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
    cutArgs = ['-segment_times', cuts.map(seconds).join(',')]
    segment = null
    if (precise) cutArgs.push('-force_key_frames', cuts.map(seconds).join(','))
  } else {
    segment = mode === 'parts' ? duration / parts : length
    if (!(segment > 0.5) || Math.ceil(duration / segment) > MAX_SPLIT_PARTS) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
    cutArgs = ['-segment_time', seconds(segment)]
    if (precise) cutArgs.push('-force_key_frames', `expr:gte(t,n_forced*${seconds(segment)})`)
  }
  // Fast: stream copy (cuts land on keyframes). Precise: re-encode with keyframes forced at every cut.
  const format = precise ? reencodeFormatFor(file) : copyFormatFor(file)
  const codec = precise ? encodeArgsFor(format).filter((arg) => arg !== '-movflags' && arg !== '+faststart') : ['-c', 'copy']
  const pattern = `part_%03d.${format}`
  const segments = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-map', '0', ...codec, '-f', 'segment', ...cutArgs, '-reset_timestamps', '1', pattern],
    output: pattern,
    outputType: OUTPUT_TYPES[format],
    collectPrefix: 'part_',
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { parts: segments, format, segmentLength: segment }
}
