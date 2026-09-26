import { runImageJob } from './imageWorkerClient'

const FIELD_GROUPS = {
  camera: ['Make', 'Model', 'LensModel', 'Software'],
  capture: ['DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'Flash', 'WhiteBalance'],
  image: ['Orientation', 'ColorSpace', 'XResolution', 'YResolution', 'ExifImageWidth', 'ExifImageHeight'],
  ownership: ['Artist', 'Copyright', 'ImageDescription'],
}

function formatValue(key, value) {
  if (value == null) return null
  if (value instanceof Date) return value.toLocaleString()
  if (key === 'ExposureTime' && typeof value === 'number') return value < 1 ? `1/${Math.round(1 / value)} s` : `${value} s`
  if (key === 'FNumber') return `f/${value}`
  if (key === 'FocalLength') return `${value} mm`
  if (typeof value === 'object') return Array.isArray(value) ? value.join(', ') : null
  return String(value)
}

/**
 * Read EXIF / IPTC / GPS metadata. Returns grouped, display-ready entries.
 * `exifr` is lazy-loaded since only this tool needs it.
 */
export async function readImageMetadata(file) {
  const { default: exifr } = await import('exifr')
  let raw = null
  try {
    raw = await exifr.parse(file, { tiff: true, exif: true, gps: true, iptc: true, xmp: false, icc: false, mergeOutput: true })
  } catch {
    raw = null
  }
  const groups = Object.entries(FIELD_GROUPS)
    .map(([group, keys]) => ({
      group,
      entries: keys.map((key) => ({ key, value: formatValue(key, raw?.[key]) })).filter((entry) => entry.value),
    }))
    .filter((group) => group.entries.length)

  const gps = raw && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude) ? { latitude: raw.latitude, longitude: raw.longitude } : null
  const totalFields = raw ? Object.keys(raw).length : 0
  return { groups, gps, totalFields, hasMetadata: totalFields > 0 }
}

/**
 * Re-encode the pixels only — canvas encoding never carries EXIF, GPS or ICC
 * data across, so the output is metadata-free. PNG stays lossless.
 */
export function stripImageMetadata(file, { signal, onProgress } = {}) {
  return runImageJob('strip-metadata', file, { format: 'original', quality: 100 }, { signal, onProgress })
}
