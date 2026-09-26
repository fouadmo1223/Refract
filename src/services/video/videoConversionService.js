import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, encodeArgsFor, gifFilter } from './encodingArgs'

export const CONVERT_QUALITY = { high: 20, balanced: 23, small: 28 }
export const CONVERT_HEIGHTS = { original: null, 1080: 1080, 720: 720, 480: 480 }

const COPYABLE = ['mp4', 'mov', 'mkv']

/**
 * Convert a video to another container/codec.
 * @param {{ format: 'mp4'|'webm'|'mov'|'avi'|'mkv'|'gif', copyStreams: boolean, quality?: 'high'|'balanced'|'small',
 *   height?: 'original'|1080|720|480, fps?: 'original'|number, keepAudio?: boolean, gifFps?: number, gifWidth?: number }} settings
 *   Resolution / fps / audio / quality apply when re-encoding (not with stream copy).
 */
export async function convertVideo(file, settings, meta, { onProgress, signal } = {}) {
  const { format } = settings
  const output = `output.${format}`
  const buildArgs = ([input]) => {
    if (format === 'gif') {
      const width = Math.min(meta?.width || 480, settings.gifWidth ?? 480)
      return ['-i', input, '-filter_complex', gifFilter({ fps: settings.gifFps ?? 12, width }), '-loop', '0', output]
    }
    if (settings.copyStreams && COPYABLE.includes(format)) {
      return ['-i', input, '-c', 'copy', ...(format === 'mkv' ? [] : ['-movflags', '+faststart']), output]
    }
    const filters = []
    const targetHeight = CONVERT_HEIGHTS[settings.height] ?? null
    if (targetHeight && (!meta?.height || meta.height > targetHeight)) filters.push(`scale=-2:${targetHeight}:flags=lanczos`)
    if (settings.fps && settings.fps !== 'original') filters.push(`fps=${settings.fps}`)
    return [
      '-i', input,
      ...(filters.length ? ['-vf', filters.join(',')] : []),
      ...(settings.keepAudio === false ? ['-an'] : []),
      ...encodeArgsFor(format, { crf: CONVERT_QUALITY[settings.quality] ?? 23 }),
      output,
    ]
  }

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs,
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration }
}
