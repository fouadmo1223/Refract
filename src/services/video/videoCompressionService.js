import { VIDEO_COMPRESSION_PRESETS, VIDEO_RESOLUTIONS } from '@/constants/presets'
import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, encodeArgsFor, even } from './encodingArgs'

function resolveSettings(settings) {
  const preset = VIDEO_COMPRESSION_PRESETS.find((item) => item.id === settings.preset) ?? VIDEO_COMPRESSION_PRESETS[2]
  const crf = settings.preset === 'custom' ? settings.crf : preset.crf
  const bitrate = settings.preset === 'custom' && settings.useBitrate ? settings.bitrate : null
  const targetHeight = VIDEO_RESOLUTIONS.find((item) => item.id === settings.resolution)?.height ?? null
  return { crf, bitrate, audioBitrate: preset.audioBitrate, encoderPreset: preset.preset, targetHeight }
}

export function getOutputDimensions(meta, targetHeight) {
  if (!meta?.width || !meta?.height || !targetHeight || targetHeight >= meta.height) return { width: meta?.width, height: meta?.height }
  return { width: even((meta.width * targetHeight) / meta.height), height: targetHeight }
}

/**
 * Rough output size estimate shown before processing. With an explicit bitrate
 * it's accurate; with CRF it uses a bits-per-pixel heuristic, so the UI labels it "estimated".
 */
export function estimateCompressedSize(meta, settings) {
  if (!meta?.duration || !meta.width || !meta.height) return null
  const { crf, bitrate, audioBitrate, targetHeight } = resolveSettings(settings)
  const audioBytes = settings.removeAudio ? 0 : (audioBitrate * 1000 * meta.duration) / 8
  if (bitrate) return (bitrate * 1000 * meta.duration) / 8 + audioBytes
  const { width, height } = getOutputDimensions(meta, targetHeight)
  const bitsPerPixel = 0.09 * 2 ** ((23 - crf) / 6)
  const videoBytes = (bitsPerPixel * width * height * 30 * meta.duration) / 8
  return videoBytes + audioBytes
}

/**
 * @param {File} file
 * @param {{ preset, crf, resolution, useBitrate, bitrate, format: 'mp4'|'webm', removeAudio: boolean }} settings
 * @param {{ duration?: number, height?: number }} meta
 */
export async function compressVideo(file, settings, meta, { onProgress, signal } = {}) {
  const { crf, bitrate, audioBitrate, encoderPreset, targetHeight } = resolveSettings(settings)
  const format = settings.format === 'webm' ? 'webm' : 'mp4'
  const output = `output.${format}`
  const scale = targetHeight && meta?.height && targetHeight < meta.height ? ['-vf', `scale=-2:${targetHeight}`] : []
  const audio = settings.removeAudio ? ['-an'] : []

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => [
      '-i',
      input,
      ...scale,
      ...encodeArgsFor(format, { crf, bitrate, audioBitrate, preset: encoderPreset }),
      ...audio,
      output,
    ],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  const dimensions = getOutputDimensions(meta, targetHeight)
  return { blob, format, ...dimensions, duration: meta?.duration }
}
