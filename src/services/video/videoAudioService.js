import { getExtension } from '@/lib/files'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { probeMedia, runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, aacArgs, copyFormatFor, encodeArgsFor, h264Args, reencodeFormatFor, seconds } from './encodingArgs'

const COPYABLE_VIDEO = ['mp4', 'mov', 'm4v']

/** Audio filter chain: volume, EBU R128 loudness normalisation and fades (times relative to the output). */
function audioChain({ volume = 100, normalize = false, fadeIn = 0, fadeOut = 0 }, duration) {
  const filters = []
  if (volume !== 100) filters.push(`volume=${(volume / 100).toFixed(2)}`)
  if (normalize) filters.push('loudnorm=I=-16:TP=-1.5:LRA=11')
  if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${seconds(fadeIn)}`)
  if (fadeOut > 0 && duration) filters.push(`afade=t=out:st=${seconds(Math.max(0, duration - fadeOut))}:d=${seconds(fadeOut)}`)
  return filters
}

export const DEFAULT_VIDEO_AUDIO = { mode: 'mute', volume: 150, normalize: false, fadeIn: 0, fadeOut: 0 }

/**
 * Change a video's sound. `mute` drops the audio (lossless stream copy);
 * `adjust` changes volume, normalises loudness and/or fades the audio in/out.
 * Video is stream-copied whenever the container allows it.
 */
export async function adjustVideoAudio(file, settings, meta, { onProgress, signal } = {}) {
  const s = { ...DEFAULT_VIDEO_AUDIO, ...settings }
  if (s.mode === 'mute') {
    const format = copyFormatFor(file)
    const output = `output.${format}`
    const blob = await runFFmpeg({
      inputs: [{ file }],
      buildArgs: ([input]) => ['-i', input, '-map', '0:v', '-c:v', 'copy', '-an', output],
      output,
      outputType: OUTPUT_TYPES[format],
      expectedDuration: meta?.duration,
      onProgress,
      signal,
    })
    return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration }
  }

  if (!(await probeMedia(file, { signal })).hasAudio) throw new AppError(ERROR_CODES.NO_AUDIO_STREAM)
  const filters = audioChain(s, meta?.duration)
  const copyVideo = COPYABLE_VIDEO.includes(getExtension(file.name))
  const format = copyVideo ? 'mp4' : reencodeFormatFor(file)
  const output = `output.${format}`
  const codecs = copyVideo ? ['-c:v', 'copy', ...aacArgs(192), '-movflags', '+faststart'] : encodeArgsFor(format, { audioBitrate: 192 })
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-map', '0:v', '-map', '0:a', ...(filters.length ? ['-af', filters.join(',')] : []), ...codecs, output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration }
}

/** Kept for existing callers: remove every audio track. */
export function muteVideo(file, meta, options) {
  return adjustVideoAudio(file, { mode: 'mute' }, meta, options)
}

const AUDIO_CODECS = {
  mp3: (bitrate) => ({ ext: 'mp3', args: ['-c:a', 'libmp3lame', '-b:a', `${bitrate}k`] }),
  wav: () => ({ ext: 'wav', args: ['-c:a', 'pcm_s16le'] }),
  aac: (bitrate) => ({ ext: 'm4a', args: ['-c:a', 'aac', '-b:a', `${bitrate}k`] }),
}

/**
 * Extract the audio track, optionally only a time range, in mono, louder or
 * quieter, normalised and with fades.
 * @param {{ format: 'mp3'|'wav'|'aac', bitrate: number, channels?: 'stereo'|'mono', start?: number, end?: number|null,
 *   volume?: number, normalize?: boolean, fadeIn?: number, fadeOut?: number }} settings
 */
export async function extractAudio(file, settings, meta, { onProgress, signal } = {}) {
  const codec = (AUDIO_CODECS[settings.format] ?? AUDIO_CODECS.mp3)(settings.bitrate ?? 192)
  const output = `output.${codec.ext}`
  const start = Math.max(0, settings.start ?? 0)
  const end = settings.end ?? meta?.duration
  const length = end != null ? Math.max(0.1, end - start) : undefined
  const filters = audioChain(settings, length)
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => [
      ...(start > 0 ? ['-ss', seconds(start)] : []),
      '-i', input,
      ...(length && (start > 0 || end < (meta?.duration ?? Infinity) - 0.05) ? ['-t', seconds(length)] : []),
      '-map', '0:a:0', '-vn',
      ...(settings.channels === 'mono' ? ['-ac', '1'] : []),
      ...(filters.length ? ['-af', filters.join(',')] : []),
      ...codec.args,
      output,
    ],
    output,
    outputType: OUTPUT_TYPES[codec.ext],
    expectedDuration: length ?? meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format: codec.ext, duration: length ?? meta?.duration }
}

/**
 * Add an audio track to a video.
 * @param {{ mode: 'replace'|'mix', loopAudio: boolean, audioVolume: number, originalVolume?: number,
 *   delay?: number, skip?: number, fadeIn?: number, fadeOut?: number }} settings
 *   delay: seconds of silence before the new audio starts; skip: seconds cut from the start of the audio file.
 */
export async function addAudioToVideo(videoFile, audioFile, settings, meta, { onProgress, signal } = {}) {
  if (settings.mode === 'mix' && !(await probeMedia(videoFile, { signal })).hasAudio) throw new AppError(ERROR_CODES.NO_AUDIO_STREAM)
  const canCopyVideo = COPYABLE_VIDEO.includes(getExtension(videoFile.name))
  const volume = (settings.audioVolume ?? 100) / 100
  const originalVolume = (settings.originalVolume ?? 100) / 100
  const delayMs = Math.round((settings.delay ?? 0) * 1000)
  const skip = Math.max(0, settings.skip ?? 0)
  const duration = meta?.duration
  const fades = []
  if (settings.fadeIn > 0) fades.push(`afade=t=in:st=${seconds(delayMs / 1000)}:d=${seconds(settings.fadeIn)}`)
  if (settings.fadeOut > 0 && duration) fades.push(`afade=t=out:st=${seconds(Math.max(0, duration - settings.fadeOut))}:d=${seconds(settings.fadeOut)}`)
  // New track: volume → delay → fades, trimmed to the video length.
  const music = [`volume=${volume}`, ...(delayMs > 0 ? [`adelay=${delayMs}|${delayMs}`] : []), ...fades, ...(duration ? [`atrim=0:${seconds(duration)}`] : [])].join(',')
  const output = 'output.mp4'

  const buildArgs = ([video, audio]) => {
    const audioInput = [...(skip > 0 ? ['-ss', seconds(skip)] : []), ...(settings.loopAudio ? ['-stream_loop', '-1'] : []), '-i', audio]
    const videoCodec = canCopyVideo ? ['-c:v', 'copy'] : h264Args()
    const graph =
      settings.mode === 'mix'
        ? `[1:a]${music}[music];[0:a]volume=${originalVolume}[orig];[orig][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`
        : `[1:a]${music}[aout]`
    return ['-i', video, ...audioInput, '-filter_complex', graph, '-map', '0:v', '-map', '[aout]', ...videoCodec, ...aacArgs(192), '-shortest', '-movflags', '+faststart', output]
  }

  const blob = await runFFmpeg({
    inputs: [{ file: videoFile }, { file: audioFile }],
    buildArgs,
    output,
    outputType: OUTPUT_TYPES.mp4,
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { blob, format: 'mp4', width: meta?.width, height: meta?.height, duration }
}
