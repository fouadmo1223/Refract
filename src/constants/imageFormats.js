/**
 * Output image formats. `lossy` controls whether a quality setting applies,
 * `alpha` whether transparency survives the export.
 */
export const IMAGE_FORMATS = {
  jpeg: { id: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', lossy: true, alpha: false },
  png: { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png', lossy: true, alpha: true },
  webp: { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true, alpha: true },
  avif: { id: 'avif', label: 'AVIF', mime: 'image/avif', ext: 'avif', lossy: true, alpha: true },
  bmp: { id: 'bmp', label: 'BMP', mime: 'image/bmp', ext: 'bmp', lossy: false, alpha: false },
  gif: { id: 'gif', label: 'GIF', mime: 'image/gif', ext: 'gif', lossy: false, alpha: true },
  ico: { id: 'ico', label: 'ICO', mime: 'image/x-icon', ext: 'ico', lossy: false, alpha: true },
  svg: { id: 'svg', label: 'SVG', mime: 'image/svg+xml', ext: 'svg', lossy: false, alpha: true },
}

/** Formats offered in converter / export selects. */
export const CONVERTIBLE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'bmp', 'gif']

/** Formats the compressor can produce. */
export const COMPRESSIBLE_FORMATS = ['jpeg', 'png', 'webp', 'avif']

const MIME_TO_FORMAT = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/gif': 'gif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

const EXT_TO_FORMAT = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  bmp: 'bmp',
  gif: 'gif',
  ico: 'ico',
}

export function getImageFormatFromFile(file) {
  if (file?.type && MIME_TO_FORMAT[file.type]) return MIME_TO_FORMAT[file.type]
  const ext = file?.name?.split('.').pop()?.toLowerCase()
  return EXT_TO_FORMAT[ext] ?? null
}

export function getImageFormat(id) {
  return IMAGE_FORMATS[id] ?? IMAGE_FORMATS.png
}
