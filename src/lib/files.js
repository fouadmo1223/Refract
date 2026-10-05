import { AppError, ERROR_CODES } from './errors'

export function getExtension(filename = '') {
  const index = filename.lastIndexOf('.')
  return index > 0 ? filename.slice(index + 1).toLowerCase() : ''
}

export function getBaseName(filename = '') {
  const index = filename.lastIndexOf('.')
  return index > 0 ? filename.slice(0, index) : filename
}

export function replaceExtension(filename, ext) {
  return `${getBaseName(filename) || 'file'}.${ext}`
}

/** Build an output name like "holiday-compressed.webp". */
export function buildOutputName(filename, suffix, ext) {
  const base = getBaseName(filename) || 'file'
  return `${base}${suffix ? `-${suffix}` : ''}.${ext ?? getExtension(filename)}`
}

/** Strip characters that are invalid in file names on common OSes. */
export function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 180)
}

function matchesType(file, types) {
  const ext = `.${getExtension(file.name)}`
  if (file.type && types[file.type]) return true
  return Object.values(types).some((extensions) => extensions.includes(ext))
}

/**
 * Validate a file against an upload profile. Throws AppError on failure.
 * Validation happens before any bytes are decoded to avoid memory spikes.
 */
export function validateFile(file, profile) {
  if (!(file instanceof Blob)) throw new AppError(ERROR_CODES.UPLOAD_FAILED)
  if (!matchesType(file, profile.types)) {
    throw new AppError(ERROR_CODES.UNSUPPORTED_FORMAT, { name: file.name, formats: profile.formatsLabel })
  }
  if (file.size > profile.maxSize) {
    throw new AppError(ERROR_CODES.FILE_TOO_LARGE, { name: file.name, maxSize: profile.maxSize })
  }
  if (file.size === 0) throw new AppError(ERROR_CODES.CORRUPTED_FILE, { name: file.name })
  return file
}

export function getFileKind(file) {
  if (!file) return null
  if (['image/heic', 'image/heif'].includes(file.type) || ['heic', 'heif'].includes(getExtension(file.name))) return 'heic'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  const ext = getExtension(file.name)
  if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'm4v', 'webm', 'mov', 'avi', 'mkv', 'ogv', '3gp', 'mpeg', 'mpg'].includes(ext)) return 'video'
  return null
}

export function createFileId(file) {
  return `${file.name}-${file.size}-${file.lastModified ?? 0}-${Math.random().toString(36).slice(2, 8)}`
}

const FORMAT_EXTENSIONS = { jpeg: 'jpg' }

/** Output name for a processed file: ("clip.mov", "compressed", "mp4") → "clip-compressed.mp4". */
export function resultFileName(fileName, suffix, format) {
  return buildOutputName(fileName, suffix, format ? (FORMAT_EXTENSIONS[format] ?? format) : undefined)
}
