/**
 * Centralized file constraints. Pages and services must read limits from here —
 * never hard-code sizes or MIME lists inside individual tools.
 */
const MB = 1024 * 1024

export const IMAGE_MAX_SIZE = 50 * MB
export const VIDEO_MAX_SIZE = 500 * MB
export const AUDIO_MAX_SIZE = 100 * MB
export const BASE64_MAX_SIZE = 10 * MB
export const BATCH_MAX_FILES = 50
export const MERGE_MAX_FILES = 10

/** Hard ceiling for canvas dimensions (browser limits sit around 16k–32k). */
export const MAX_CANVAS_DIMENSION = 16384
export const MAX_CANVAS_PIXELS = 16384 * 16384 * 0.5

export const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
}

export const SUPPORTED_SVG_TYPES = {
  'image/svg+xml': ['.svg'],
}

export const SUPPORTED_HEIC_TYPES = {
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
}

export const SUPPORTED_GIF_TYPES = {
  'image/gif': ['.gif'],
}

export const SUPPORTED_VIDEO_TYPES = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/ogg': ['.ogv'],
  'video/3gpp': ['.3gp'],
  'video/mpeg': ['.mpeg', '.mpg'],
}

export const SUPPORTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/aac': ['.aac'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg', '.oga'],
  'audio/flac': ['.flac'],
  'audio/webm': ['.weba'],
}

/**
 * Upload "profiles" bundle a type map with its size limit and the
 * human-readable format hint shown in the uploader.
 */
export const UPLOAD_PROFILES = {
  image: {
    kind: 'image',
    types: SUPPORTED_IMAGE_TYPES,
    maxSize: IMAGE_MAX_SIZE,
    formatsLabel: 'JPG, PNG, WebP, AVIF, GIF, BMP',
  },
  video: {
    kind: 'video',
    types: SUPPORTED_VIDEO_TYPES,
    maxSize: VIDEO_MAX_SIZE,
    formatsLabel: 'MP4, WebM, MOV, AVI, MKV',
  },
  heic: {
    kind: 'image',
    types: SUPPORTED_HEIC_TYPES,
    maxSize: IMAGE_MAX_SIZE,
    formatsLabel: 'HEIC, HEIF',
  },
  gif: {
    kind: 'image',
    types: SUPPORTED_GIF_TYPES,
    maxSize: IMAGE_MAX_SIZE,
    formatsLabel: 'GIF',
  },
  svg: {
    kind: 'image',
    types: SUPPORTED_SVG_TYPES,
    maxSize: 10 * MB,
    formatsLabel: 'SVG',
  },
  audio: {
    kind: 'audio',
    types: SUPPORTED_AUDIO_TYPES,
    maxSize: AUDIO_MAX_SIZE,
    formatsLabel: 'MP3, WAV, AAC, M4A, OGG',
  },
  any: {
    kind: 'any',
    types: { ...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_HEIC_TYPES, ...SUPPORTED_VIDEO_TYPES },
    maxSize: VIDEO_MAX_SIZE,
    formatsLabel: 'JPG, PNG, WebP, HEIC, MP4, WebM, MOV',
  },
}

export function getAcceptString(types) {
  return [...Object.keys(types), ...Object.values(types).flat()].join(',')
}
