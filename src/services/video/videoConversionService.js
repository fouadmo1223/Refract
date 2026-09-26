import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, encodeArgsFor, gifFilter } from './encodingArgs'

const COPYABLE = ['mp4', 'mov', 'mkv']

/**
 * Convert a video to another container/codec.
 * @param {{ format: 'mp4'|'webm'|'mov'|'avi'|'mkv'|'gif', copyStreams: boolean }} settings
 */
export async function convertVideo(file, settings, meta, { onProgress, signal } = {}) {
  const { format } = settings
  const output = `output.${format}`
  const buildArgs = ([input]) => {
    if (format === 'gif') {
      const width = Math.min(meta?.width || 480, 480)
      return ['-i', input, '-filter_complex', gifFilter({ fps: 12, width }), '-loop', '0', output]
    }
    if (settings.copyStreams && COPYABLE.includes(format)) {
      return ['-i', input, '-c', 'copy', ...(format === 'mkv' ? [] : ['-movflags', '+faststart']), output]
    }
    return ['-i', input, ...encodeArgsFor(format), output]
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
