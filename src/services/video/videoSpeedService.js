import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, atempoChain, encodeArgsFor, reencodeFormatFor } from './encodingArgs'

/**
 * Change playback speed. Audio is time-stretched with `atempo`, which keeps pitch natural.
 * @param {{ speed: number, keepAudio: boolean }} settings
 */
export async function changeVideoSpeed(file, { speed, keepAudio }, meta, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const expectedDuration = meta?.duration ? meta.duration / speed : undefined
  const audio = keepAudio ? ['-af', atempoChain(speed)] : ['-an']

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-vf', `setpts=PTS/${speed}`, ...audio, ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: expectedDuration }
}
