import { AppError, ERROR_CODES, throwIfAborted } from '@/lib/errors'
import { canvasToBlob, decodeImage } from '@/services/image/canvas'

/**
 * PDF engine. pdf.js renders pages (previews, PDF → image, rasterising for
 * compression); pdf-lib creates and edits documents. Both are lazy-loaded so
 * only the PDF tools pay for them, and everything runs in the browser.
 */

let pdfjsPromise = null
let pdfLibPromise = null

export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

export function loadPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import('pdf-lib')
  return pdfLibPromise
}

/** Open a PDF with pdf.js (for rendering / text). Caller should `destroy()` it. */
export async function openPdf(file) {
  const pdfjs = await loadPdfJs()
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    const task = pdfjs.getDocument({ data, isEvalSupported: false })
    const pdf = await task.promise
    // Newer pdf.js releases the document through its loading task.
    if (typeof pdf.destroy !== 'function') pdf.destroy = () => task.destroy()
    return pdf
  } catch (error) {
    if (error?.name === 'PasswordException') throw new AppError(ERROR_CODES.PDF_PROTECTED, {}, error)
    throw new AppError(ERROR_CODES.CORRUPTED_FILE, {}, error)
  }
}

/** Open a PDF with pdf-lib (for editing). */
export async function openPdfDocument(file) {
  const { PDFDocument } = await loadPdfLib()
  try {
    return await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  } catch (error) {
    throw new AppError(ERROR_CODES.CORRUPTED_FILE, {}, error)
  }
}

/** loadMeta for PDF tools: page count + first page size (points). */
export async function readPdfInfo(file) {
  const pdf = await openPdf(file)
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    return { pages: pdf.numPages, width: Math.round(viewport.width), height: Math.round(viewport.height), format: 'pdf', name: file.name }
  } finally {
    pdf.destroy()
  }
}

/**
 * Render one page (1-based) to a canvas at `scale` (1 = 72 dpi).
 * Uses pdf.js's print intent: it renders without requestAnimationFrame, so
 * previews and exports keep going in background tabs.
 */
export async function renderPdfPage(pdf, pageNumber, { scale = 1, rotation = 0, background = '#FFFFFF', intent = 'print' } = {}) {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const context = canvas.getContext('2d')
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  await page.render({ canvasContext: context, viewport, intent, background: background ?? 'rgba(0,0,0,0)' }).promise
  page.cleanup()
  return canvas
}

/** Small page thumbnails as object URLs (callers revoke them). */
export async function renderPdfThumbnails(file, { width = 180, signal, onThumb } = {}) {
  const pdf = await openPdf(file)
  const urls = []
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      if (signal?.aborted) break
      const page = await pdf.getPage(number)
      const base = page.getViewport({ scale: 1 })
      const canvas = await renderPdfPage(pdf, number, { scale: width / base.width })
      const url = URL.createObjectURL(await canvasToBlob(canvas, 'image/jpeg', 0.8))
      urls.push(url)
      onThumb?.(number - 1, url, { width: base.width, height: base.height, rotation: page.rotate })
    }
    return urls
  } finally {
    pdf.destroy()
  }
}

/**
 * Parse "1-3, 5, 8-" into 0-based page indexes (in order, without duplicates).
 * Returns null when the text is invalid.
 */
export function parsePageRanges(text, pageCount) {
  const result = []
  const seen = new Set()
  const parts = String(text ?? '').split(/[,\s]+/).filter(Boolean)
  if (!parts.length) return null
  for (const part of parts) {
    const match = part.match(/^(\d+)?(?:(-)(\d+)?)?$/)
    if (!match || (!match[1] && !match[3])) return null
    const start = match[1] ? Number(match[1]) : 1
    const end = match[2] ? (match[3] ? Number(match[3]) : pageCount) : start
    if (start < 1 || end > pageCount || start > end) return null
    for (let page = start; page <= end; page += 1) {
      if (!seen.has(page)) {
        seen.add(page)
        result.push(page - 1)
      }
    }
  }
  return result
}

async function savePdf(doc, { title } = {}) {
  if (title) doc.setTitle(title)
  doc.setProducer('Refract')
  doc.setCreator('Refract')
  const bytes = await doc.save({ useObjectStreams: true })
  return new Blob([bytes], { type: 'application/pdf' })
}

// ---------------------------------------------------------------- Images → PDF
export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a5: [419.53, 595.28] }

/**
 * @param {File[]} files images in page order
 * @param {{ pageSize: 'fit'|'a4'|'letter'|'legal'|'a5', orientation: 'auto'|'portrait'|'landscape', margin: number, fit: 'contain'|'cover', quality: number }} settings
 *   margin in points (1/72 in); `fit` page size makes each page exactly the image size.
 */
export async function imagesToPdf(files, settings, { onProgress, signal } = {}) {
  const { PDFDocument } = await loadPdfLib()
  const doc = await PDFDocument.create()
  for (const [index, file] of files.entries()) {
    throwIfAborted(signal)
    const bitmap = await decodeImage(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    const isPng = file.type === 'image/png' || file.type === 'image/gif'
    if (!isPng) {
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(bitmap, 0, 0)
    bitmap.close?.()
    // PNG keeps transparency and sharp edges; everything else is re-encoded as JPEG.
    const blob = await canvasToBlob(canvas, isPng ? 'image/png' : 'image/jpeg', (settings.quality ?? 90) / 100)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)

    let pageWidth
    let pageHeight
    if (settings.pageSize === 'fit') {
      pageWidth = image.width * 0.75 + settings.margin * 2
      pageHeight = image.height * 0.75 + settings.margin * 2
    } else {
      ;[pageWidth, pageHeight] = PAGE_SIZES[settings.pageSize] ?? PAGE_SIZES.a4
      const landscape = settings.orientation === 'landscape' || (settings.orientation === 'auto' && image.width > image.height)
      if (landscape) [pageWidth, pageHeight] = [pageHeight, pageWidth]
    }
    const page = doc.addPage([pageWidth, pageHeight])
    const boxWidth = pageWidth - settings.margin * 2
    const boxHeight = pageHeight - settings.margin * 2
    const scale = settings.pageSize === 'fit' ? 0.75 : settings.fit === 'cover' ? Math.max(boxWidth / image.width, boxHeight / image.height) : Math.min(boxWidth / image.width, boxHeight / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    page.drawImage(image, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight })
    onProgress?.((index + 1) / files.length, 'processing')
  }
  const blob = await savePdf(doc)
  return { blob, format: 'pdf', pages: files.length }
}

// ---------------------------------------------------------------- PDF → images
/**
 * @param {{ format: 'png'|'jpeg'|'webp', dpi: number, quality: number, pages: number[]|null }} settings pages are 0-based
 */
export async function pdfToImages(file, settings, { onProgress, signal } = {}) {
  const pdf = await openPdf(file)
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[settings.format] ?? 'image/png'
  const ext = settings.format === 'jpeg' ? 'jpg' : settings.format
  const indexes = settings.pages?.length ? settings.pages : Array.from({ length: pdf.numPages }, (_, index) => index)
  const images = []
  try {
    for (const [position, index] of indexes.entries()) {
      throwIfAborted(signal)
      const canvas = await renderPdfPage(pdf, index + 1, { scale: settings.dpi / 72, background: settings.format === 'png' && settings.transparent ? null : '#FFFFFF' })
      const blob = await canvasToBlob(canvas, mime, (settings.quality ?? 90) / 100)
      images.push({ name: `page-${String(index + 1).padStart(3, '0')}.${ext}`, blob, width: canvas.width, height: canvas.height })
      onProgress?.((position + 1) / indexes.length, 'processing')
    }
  } finally {
    pdf.destroy()
  }
  return { images, format: settings.format }
}

// ---------------------------------------------------------------- Merge
export async function mergePdfs(files, { onProgress, signal } = {}) {
  const { PDFDocument } = await loadPdfLib()
  const merged = await PDFDocument.create()
  for (const [index, file] of files.entries()) {
    throwIfAborted(signal)
    const source = await openPdfDocument(file)
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
    onProgress?.((index + 1) / files.length, 'processing')
  }
  const blob = await savePdf(merged)
  return { blob, format: 'pdf', pages: merged.getPageCount() }
}

// ---------------------------------------------------------------- Pages: organise / extract / split
/**
 * Build a new PDF from page operations.
 * @param {{ index: number, rotation?: number }[]} pages 0-based source pages in output order, with extra rotation (degrees)
 */
export async function buildPdfFromPages(file, pages, { onProgress } = {}) {
  const { PDFDocument, degrees } = await loadPdfLib()
  const source = await openPdfDocument(file)
  const output = await PDFDocument.create()
  const copied = await output.copyPages(
    source,
    pages.map((page) => page.index),
  )
  copied.forEach((page, position) => {
    const extra = pages[position].rotation ?? 0
    if (extra) page.setRotation(degrees((page.getRotation().angle + extra) % 360))
    output.addPage(page)
  })
  onProgress?.(0.9, 'finalizing')
  const blob = await savePdf(output)
  return { blob, format: 'pdf', pages: pages.length }
}

/**
 * Split into several PDFs.
 * @param {number[][]} groups 0-based page indexes per output file
 */
export async function splitPdf(file, groups, { onProgress, signal } = {}) {
  const parts = []
  for (const [index, group] of groups.entries()) {
    throwIfAborted(signal)
    const { blob } = await buildPdfFromPages(
      file,
      group.map((page) => ({ index: page })),
    )
    parts.push({ blob, pages: group })
    onProgress?.((index + 1) / groups.length, 'processing')
  }
  return { parts, format: 'pdf' }
}

// ---------------------------------------------------------------- Compress
/**
 * `lossless`: re-save with object streams (removes unused objects, small gains).
 * `strong`: render every page to a JPEG at `dpi` and rebuild — much smaller for
 * scans and image-heavy files, but text is no longer selectable.
 */
export async function compressPdf(file, { mode, dpi = 120, quality = 70 }, { onProgress, signal } = {}) {
  if (mode === 'lossless') {
    const doc = await openPdfDocument(file)
    onProgress?.(0.6, 'processing')
    const blob = await savePdf(doc)
    if (blob.size >= file.size) return { blob: file, format: 'pdf', pages: doc.getPageCount(), unchanged: true }
    return { blob, format: 'pdf', pages: doc.getPageCount() }
  }
  const { PDFDocument } = await loadPdfLib()
  const pdf = await openPdf(file)
  const output = await PDFDocument.create()
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      throwIfAborted(signal)
      const page = await pdf.getPage(number)
      const base = page.getViewport({ scale: 1, rotation: page.rotate })
      const canvas = await renderPdfPage(pdf, number, { scale: dpi / 72 })
      const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality / 100)
      const image = await output.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
      const outPage = output.addPage([base.width, base.height])
      outPage.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height })
      onProgress?.(number / pdf.numPages, 'processing')
    }
  } finally {
    pdf.destroy()
  }
  const blob = await savePdf(output)
  // Vector/text PDFs can grow when rasterised — keep the original then.
  if (blob.size >= file.size) return { blob: file, format: 'pdf', pages: output.getPageCount(), unchanged: true }
  return { blob, format: 'pdf', pages: output.getPageCount() }
}
