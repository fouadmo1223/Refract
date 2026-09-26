import { zip } from 'fflate'
import { AppError, ERROR_CODES } from './errors'

/** Trigger a browser download for a Blob without leaking the object URL. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/** Ensure names inside an archive are unique ("a.jpg", "a (2).jpg"). */
function dedupeNames(entries) {
  const seen = new Map()
  return entries.map(({ name, blob }) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    if (count === 0) return { name, blob }
    const dot = name.lastIndexOf('.')
    const unique = dot > 0 ? `${name.slice(0, dot)} (${count + 1})${name.slice(dot)}` : `${name} (${count + 1})`
    return { name: unique, blob }
  })
}

/**
 * Bundle blobs into a ZIP. Media is already compressed, so entries are stored
 * (level 0) which keeps zipping fast and memory-friendly.
 */
export async function createZip(entries) {
  const files = {}
  for (const { name, blob } of dedupeNames(entries)) {
    files[name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
  }
  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, data) => {
      if (error) reject(new AppError(ERROR_CODES.PROCESSING_FAILED, {}, error))
      else resolve(new Blob([data], { type: 'application/zip' }))
    })
  })
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
