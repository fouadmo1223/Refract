import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, gifFilter, h264Args, seconds, vp8Args } from './encodingArgs'
import { validateTimeRange } from './videoTrimService'

const GIF_QUALITY = {
  high: { colors: 256, dither: 'sierra2_4a' },
  medium: { colors: 128, dither: 'bayer:bayer_scale=3' },
  low: { colors: 64, dither: 'bayer:bayer_scale=5' },
}

/**
 * Convert a video segment to an animated GIF using a two-pass palette for clean colors.
 * @param {{ start: number, end: number, fps: number, width: number, quality: 'high'|'medium'|'low',
 *   speed?: number, playback?: 'normal'|'reverse'|'boomerang', loop?: number, square?: boolean }} settings
 *   loop: 0 = forever, -1 = play once, n = repeat n more times.
 */
export async function videoToGif(file, settings, meta, { onProgress, signal } = {}) {
  validateTimeRange(settings.start, settings.end, meta?.duration)
  const clip = settings.end - settings.start
  const speed = settings.speed ?? 1
  const quality = GIF_QUALITY[settings.quality] ?? GIF_QUALITY.high
  const width = Math.min(settings.width, meta?.width || settings.width)
  const pre = []
  if (settings.square) pre.push("crop='min(iw,ih)':'min(iw,ih)'")
  if (speed !== 1) pre.push(`setpts=PTS/${speed}`)
  const prefix = pre.length ? `${pre.join(',')},` : ''
  const palette = gifFilter({ fps: settings.fps, width, ...quality })
  let graph
  if (settings.playback === 'reverse') graph = `[0:v]${prefix}reverse,${palette}`
  else if (settings.playback === 'boomerang') graph = `[0:v]${prefix}split[f][b];[b]reverse[r];[f][r]concat=n=2:v=1:a=0,${palette}`
  else graph = `[0:v]${prefix}${palette}`
  const duration = (clip / speed) * (settings.playback === 'boomerang' ? 2 : 1)
  const output = 'output.gif'

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-ss', seconds(settings.start), '-t', seconds(clip), '-i', input, '-filter_complex', graph, '-loop', String(settings.loop ?? 0), output],
    output,
    outputType: OUTPUT_TYPES.gif,
    expectedDuration: duration,
    onProgress,
    signal,
  })
  const height = settings.square ? width : meta?.width ? Math.round((meta.height / meta.width) * width) : null
  return { blob, format: 'gif', width, height, duration }
}

/**
 * Convert an animated GIF into MP4 or WebM (much smaller, plays everywhere).
 * @param {{ format: 'mp4'|'webm', loops: number, speed?: number, scale?: number, background?: string }} settings
 *   scale 1–4 uses nearest-neighbour so pixel art stays crisp; background fills transparent pixels.
 */
export async function gifToVideo(file, settings, meta, { onProgress, signal } = {}) {
  const format = settings.format === 'webm' ? 'webm' : 'mp4'
  const output = `output.${format}`
  const loops = Math.max(1, settings.loops ?? 1)
  const speed = settings.speed ?? 1
  const scale = settings.scale ?? 1
  const background = (settings.background ?? '#FFFFFF').replace('#', '0x')
  // Flatten transparency onto the background colour, then scale and force even sizes for the encoders.
  const graph =
    `color=c=${background}:s=16x16[bg];[bg][0:v]scale2ref[bgs][fg];[bgs][fg]overlay=format=auto:shortest=1,` +
    `${speed !== 1 ? `setpts=PTS/${speed},` : ''}scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2:flags=neighbor,format=yuv420p[v]`
  const duration = meta?.duration ? (meta.duration * loops) / speed : null

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => [
      ...(loops > 1 ? ['-stream_loop', String(loops - 1)] : []),
      '-i', input,
      '-filter_complex', graph, '-map', '[v]',
      '-an',
      ...(format === 'webm' ? vp8Args() : [...h264Args(), '-movflags', '+faststart']),
      output,
    ],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: duration ?? undefined,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width ? meta.width * scale : null, height: meta?.height ? meta.height * scale : null, duration }
}
