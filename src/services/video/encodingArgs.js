import { getExtension } from '@/lib/files'

/**
 * Shared FFmpeg argument builders. Services compose these so every tool
 * encodes consistently (H.264 + AAC in MP4, VP8 + Vorbis in WebM, …).
 */

export const OUTPUT_TYPES = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
}

/**
 * Keep source frame timing. Browser/screen recordings are variable-frame-rate;
 * FFmpeg's default CFR output would duplicate frames to a guessed rate
 * (often 1000 fps timebases), making encodes several times slower and larger.
 */
const KEEP_TIMING = ['-fps_mode', 'vfr']

export function h264Args({ crf = 23, preset = 'veryfast', bitrate } = {}) {
  const rate = bitrate ? ['-b:v', `${bitrate}k`, '-maxrate', `${Math.round(bitrate * 1.5)}k`, '-bufsize', `${bitrate * 2}k`] : ['-crf', String(crf)]
  return [...KEEP_TIMING, '-c:v', 'libx264', '-preset', preset, ...rate, '-pix_fmt', 'yuv420p']
}

export function vp8Args({ crf = 10, bitrate = 1500 } = {}) {
  return [...KEEP_TIMING, '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-crf', String(crf), '-b:v', `${bitrate}k`, '-pix_fmt', 'yuv420p']
}

export function aacArgs(bitrate = 128) {
  return ['-c:a', 'aac', '-b:a', `${bitrate}k`]
}

/** Container-appropriate video + audio encoding arguments. */
export function encodeArgsFor(format, { crf, bitrate, audioBitrate = 128, preset } = {}) {
  switch (format) {
    case 'webm':
      return [...vp8Args({ crf: crf != null ? Math.max(4, Math.min(63, crf - 12)) : 10, bitrate: bitrate ?? 1500 }), '-c:a', 'libvorbis', '-b:a', `${audioBitrate}k`]
    case 'avi':
      return ['-c:v', 'mpeg4', '-q:v', '4', '-c:a', 'libmp3lame', '-b:a', `${audioBitrate}k`]
    case 'mkv':
      return [...h264Args({ crf, bitrate, preset }), ...aacArgs(audioBitrate)]
    case 'mov':
    case 'mp4':
    default:
      return [...h264Args({ crf, bitrate, preset }), ...aacArgs(audioBitrate), '-movflags', '+faststart']
  }
}

/** Keep WebM as WebM, everything else becomes MP4 when re-encoding. */
export function reencodeFormatFor(file) {
  return getExtension(file.name) === 'webm' ? 'webm' : 'mp4'
}

/** Containers that accept stream copy of the source without re-encoding. */
export function copyFormatFor(file) {
  const ext = getExtension(file.name)
  return ['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext) ? (ext === 'm4v' ? 'mp4' : ext) : 'mp4'
}

export function even(value) {
  return Math.max(2, Math.round(value / 2) * 2)
}

export function gifFilter({ fps, width, colors = 256, dither = 'sierra2_4a' }) {
  return `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=${dither}`
}

/** atempo only accepts 0.5–2.0 per instance; chain for other factors. */
export function atempoChain(speed) {
  const filters = []
  let remaining = speed
  while (remaining < 0.5) {
    filters.push('atempo=0.5')
    remaining /= 0.5
  }
  while (remaining > 2) {
    filters.push('atempo=2.0')
    remaining /= 2
  }
  filters.push(`atempo=${remaining.toFixed(4)}`)
  return filters.join(',')
}

export function seconds(value) {
  return Math.max(0, value).toFixed(3)
}
