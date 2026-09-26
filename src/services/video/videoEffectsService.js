import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, copyFormatFor, encodeArgsFor, reencodeFormatFor } from './encodingArgs'

/** Repeat a video N times (stream copy — fast and lossless). */
export async function loopVideo(file, { loops }, meta, { onProgress, signal } = {}) {
  const format = copyFormatFor(file)
  const output = `output.${format}`
  const expectedDuration = meta?.duration ? meta.duration * loops : undefined
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-stream_loop', String(loops - 1), '-i', input, '-c', 'copy', output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: expectedDuration }
}

/**
 * Play a video backwards. FFmpeg buffers every frame to reverse them, so
 * the UI recommends short clips (see REVERSE_RECOMMENDED_MAX_SECONDS).
 */
export const REVERSE_RECOMMENDED_MAX_SECONDS = 30

export async function reverseVideo(file, { reverseAudio }, meta, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-vf', 'reverse', ...(reverseAudio ? ['-af', 'areverse'] : ['-an']), ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration }
}
