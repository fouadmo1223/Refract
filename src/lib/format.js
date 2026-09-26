import i18n from '@/i18n'

function getLocale() {
  // Arabic UI keeps Latin digits so numbers match input fields and file names.
  return i18n.language === 'ar' ? 'ar-u-nu-latn' : 'en'
}

const UNITS = ['B', 'KB', 'MB', 'GB']

export function formatBytes(bytes, { decimals } = {}) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const digits = decimals ?? (exponent === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2)
  const number = new Intl.NumberFormat(getLocale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)
  return `${number} ${UNITS[exponent]}`
}

export function formatNumber(value, options) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(getLocale(), options).format(value)
}

export function formatPercent(ratio, digits = 0) {
  if (!Number.isFinite(ratio)) return '—'
  return new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: digits }).format(ratio)
}

/** 83.4 → "1:23.4" ; 3725 → "1:02:05" */
export function formatDuration(seconds, { precise = false } = {}) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const secText = precise ? secs.toFixed(1).padStart(4, '0') : String(Math.floor(secs)).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secText}`
  return `${minutes}:${secText}`
}

/** Parse "1:23.5", "83.5" or "1:02:03" into seconds. Returns NaN when invalid. */
export function parseTimecode(text) {
  if (typeof text !== 'string' || !text.trim()) return NaN
  const parts = text.trim().split(':')
  if (parts.length > 3 || parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) return NaN
  return parts.reduce((total, part) => total * 60 + Number(part), 0)
}

export function formatDimensions(width, height) {
  if (!width || !height) return '—'
  return `${formatNumber(width)} × ${formatNumber(height)}`
}

export function formatRelativeTime(timestamp) {
  const diff = (timestamp - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second')
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  return rtf.format(Math.round(diff / 3600), 'hour')
}
