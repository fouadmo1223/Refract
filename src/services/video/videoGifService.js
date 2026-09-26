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
 * @param {{ start: number, end: number, fps: number, width: number, quality: 'high'|'medium'|'low' }} settings
 */
export async function videoToGif(file, settings, meta, { onProgress, signal } = {}) {
  validateTimeRange(settings.start, settings.end, meta?.duration)
  const duration = settings.end - settings.start
  const quality = GIF_QUALITY[settings.quality] ?? GIF_QUALITY.high
  const width = Math.min(settings.width, meta?.width || settings.width)
  const output = 'output.gif'

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => [
      '-ss', seconds(settings.start), '-t', seconds(duration), '-i', input,
      '-filter_complex', gifFilter({ fps: settings.fps, width, ...quality }),
      '-loop', '0', output,
    ],
    output,
    outputType: OUTPUT_TYPES.gif,
    expectedDuration: duration,
    onProgress,
    signal,
  })
  const height = meta?.width ? Math.round((meta.height / meta.width) * width) : null
  return { blob, format: 'gif', width, height, duration }
}

/**
 * Convert an animated GIF into MP4 or WebM (much smaller, plays everywhere).
 * @param {{ format: 'mp4'|'webm', loops: number }} settings
 */
export async function gifToVideo(file, settings, meta, { onProgress, signal } = {}) {
  const format = settings.format === 'webm' ? 'webm' : 'mp4'
  const output = `output.${format}`
  const loops = Math.max(1, settings.loops ?? 1)
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => [
      ...(loops > 1 ? ['-stream_loop', String(loops - 1)] : []),
      '-i', input,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-an',
      ...(format === 'webm' ? vp8Args() : [...h264Args(), '-movflags', '+faststart']),
      output,
    ],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration ? meta.duration * loops : undefined,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration ? meta.duration * loops : null }
}
