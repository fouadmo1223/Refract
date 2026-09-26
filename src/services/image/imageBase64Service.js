import { AppError, ERROR_CODES } from '@/lib/errors'
import { BASE64_MAX_SIZE } from '@/constants/fileConstraints'

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new AppError(ERROR_CODES.CORRUPTED_FILE))
    reader.readAsDataURL(file)
  })
}

const SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/bmp', bytes: [0x42, 0x4d] },
  { mime: 'image/x-icon', bytes: [0x00, 0x00, 0x01, 0x00] },
]

function sniffMime(bytes) {
  const match = SIGNATURES.find((signature) => signature.bytes.every((byte, index) => bytes[index] === byte))
  if (match) return match.mime
  const head = new TextDecoder().decode(bytes.slice(0, 64))
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp'
  if (head.slice(4, 12).startsWith('ftypavif')) return 'image/avif'
  if (/^\s*<(\?xml|svg)/i.test(head)) return 'image/svg+xml'
  return null
}

/**
 * Decode a data URI or raw base64 string into an image Blob.
 * Throws INVALID_BASE64 for malformed input or non-image content.
 */
export function base64ToImageBlob(input) {
  const text = input.trim()
  if (!text) throw new AppError(ERROR_CODES.INVALID_BASE64)
  const match = text.match(/^data:([\w/+.-]+)?(;[\w-]+=[\w-]+)*;base64,([\s\S]*)$/)
  const payload = (match ? match[3] : text).replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(payload)) throw new AppError(ERROR_CODES.INVALID_BASE64)
  if (payload.length * 0.75 > BASE64_MAX_SIZE) throw new AppError(ERROR_CODES.FILE_TOO_LARGE, { maxSize: BASE64_MAX_SIZE })

  let binary
  try {
    binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  } catch {
    throw new AppError(ERROR_CODES.INVALID_BASE64)
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const mime = sniffMime(bytes) ?? match?.[1]
  if (!mime?.startsWith('image/')) throw new AppError(ERROR_CODES.INVALID_BASE64)
  return new Blob([bytes], { type: mime })
}
