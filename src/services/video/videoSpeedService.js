import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, atempoChain, encodeArgsFor, reencodeFormatFor } from './encodingArgs'

export const SPEED_AUDIO_MODES = ['keep', 'pitch', 'mute']

/**
 * Change playback speed.
 * - audio `keep`: time-stretched with `atempo`, pitch stays natural
 * - audio `pitch`: resampled like a tape — faster sounds higher, slower sounds deeper
 * - `smooth`: when slowing down, blend in-between frames instead of repeating them
 * @param {{ speed: number, audio?: 'keep'|'pitch'|'mute', keepAudio?: boolean, smooth?: boolean }} settings
 */
export async function changeVideoSpeed(file, { speed, audio, keepAudio, smooth }, meta, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const expectedDuration = meta?.duration ? meta.duration / speed : undefined
  const mode = audio ?? (keepAudio === false ? 'mute' : 'keep')
  const audioArgs =
    mode === 'mute' ? ['-an'] : mode === 'pitch' ? ['-af', `aresample=48000,asetrate=${Math.round(48000 * speed)},aresample=48000`] : ['-af', atempoChain(speed)]
  const video = [`setpts=PTS/${speed}`]
  if (smooth && speed < 1) video.push('minterpolate=fps=30:mi_mode=blend')

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-vf', video.join(','), ...audioArgs, ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: expectedDuration }
}
