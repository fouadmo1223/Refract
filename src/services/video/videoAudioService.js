import { getExtension } from '@/lib/files'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { probeMedia, runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, aacArgs, copyFormatFor, h264Args } from './encodingArgs'

/** Remove every audio track. Video is stream-copied, so this is fast and lossless. */
export async function muteVideo(file, meta, { onProgress, signal } = {}) {
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

const AUDIO_CODECS = {
  mp3: (bitrate) => ({ ext: 'mp3', args: ['-c:a', 'libmp3lame', '-b:a', `${bitrate}k`] }),
  wav: () => ({ ext: 'wav', args: ['-c:a', 'pcm_s16le'] }),
  aac: (bitrate) => ({ ext: 'm4a', args: ['-c:a', 'aac', '-b:a', `${bitrate}k`] }),
}

/**
 * Extract the audio track.
 * @param {{ format: 'mp3'|'wav'|'aac', bitrate: number }} settings
 */
export async function extractAudio(file, settings, meta, { onProgress, signal } = {}) {
  const codec = (AUDIO_CODECS[settings.format] ?? AUDIO_CODECS.mp3)(settings.bitrate ?? 192)
  const output = `output.${codec.ext}`
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-map', '0:a:0', '-vn', ...codec.args, output],
    output,
    outputType: OUTPUT_TYPES[codec.ext],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format: codec.ext, duration: meta?.duration }
}

/**
 * Add an audio track to a video.
 * @param {{ mode: 'replace'|'mix', loopAudio: boolean, audioVolume: number }} settings
 */
export async function addAudioToVideo(videoFile, audioFile, settings, meta, { onProgress, signal } = {}) {
  let videoHasAudio = false
  if (settings.mode === 'mix') {
    videoHasAudio = (await probeMedia(videoFile, { signal })).hasAudio
    if (!videoHasAudio) throw new AppError(ERROR_CODES.NO_AUDIO_STREAM)
  }
  const canCopyVideo = ['mp4', 'mov', 'm4v'].includes(getExtension(videoFile.name))
  const volume = (settings.audioVolume ?? 100) / 100
  const output = 'output.mp4'

  const buildArgs = ([video, audio]) => {
    const audioInput = settings.loopAudio ? ['-stream_loop', '-1', '-i', audio] : ['-i', audio]
    const videoCodec = canCopyVideo ? ['-c:v', 'copy'] : h264Args()
    if (settings.mode === 'mix') {
      return [
        '-i', video, ...audioInput,
        '-filter_complex', `[1:a]volume=${volume}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
        '-map', '0:v', '-map', '[aout]', ...videoCodec, ...aacArgs(192), '-movflags', '+faststart', output,
      ]
    }
    return [
      '-i', video, ...audioInput,
      '-map', '0:v', '-map', '1:a', '-filter:a', `volume=${volume}`,
      ...videoCodec, ...aacArgs(192), '-shortest', '-movflags', '+faststart', output,
    ]
  }

  const blob = await runFFmpeg({
    inputs: [{ file: videoFile }, { file: audioFile }],
    buildArgs,
    output,
    outputType: OUTPUT_TYPES.mp4,
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format: 'mp4', width: meta?.width, height: meta?.height, duration: meta?.duration }
}
