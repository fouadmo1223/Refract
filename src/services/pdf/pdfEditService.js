import { canvasToBlob } from '@/services/image/canvas'
import { loadPdfJs, loadPdfLib, openPdfDocument } from './pdfService'

/**
 * PDF editor back end. Element coordinates are in PDF points with the origin
 * at the top-left of the page *as displayed* (pdf.js viewport at scale 1, page
 * rotation applied); export converts them to PDF user space.
 */

/** Text runs on a page, as boxes in display coordinates (for "edit existing text"). */
export async function getTextItems(pdf, pageNumber) {
  const pdfjs = await loadPdfJs()
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  // Loading the operator list resolves the page's fonts, whose real names
  // ("Helvetica-Bold", "TimesNewRoman,Italic"…) reveal family and style.
  await page.getOperatorList().catch(() => null)
  const realName = (id) => {
    try {
      return page.commonObjs.has(id) ? (page.commonObjs.get(id)?.name ?? '') : ''
    } catch {
      return ''
    }
  }
  const items = []
  for (const item of content.items) {
    if (!item.str?.trim()) continue
    const [a, b, , , e, f] = pdfjs.Util.transform(viewport.transform, item.transform)
    const fontSize = Math.hypot(a, b)
    if (!fontSize) continue
    const style = content.styles[item.fontName] ?? {}
    const name = `${realName(item.fontName)} ${style.fontFamily ?? ''}`
    const family = /mono|courier/i.test(name) ? 'courier' : /times|serif|georgia|garamond|cambria/i.test(name) && !/sans/i.test(name) ? 'times' : 'helvetica'
    items.push({
      text: item.str,
      x: e,
      y: f - fontSize * 0.85,
      width: Math.max(item.width * (fontSize / Math.max(1e-6, Math.hypot(item.transform[0], item.transform[1]))), fontSize * 0.5),
      height: fontSize * 1.15,
      fontSize,
      fontFamily: family,
      bold: /bold|black|heavy|semibold/i.test(name),
      italic: /italic|oblique/i.test(name),
    })
  }
  page.cleanup()
  return items
}

const FONT_NAMES = {
  helvetica: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'],
  times: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'],
  courier: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'],
}
const CSS_FAMILIES = { helvetica: 'Helvetica, Arial, sans-serif', times: '"Times New Roman", Times, serif', courier: '"Courier New", Courier, monospace' }

export const cssFontFamily = (family) => CSS_FAMILIES[family] ?? CSS_FAMILIES.helvetica

function hexToRgb(hex, rgb) {
  const value = (hex ?? '#000000').replace('#', '')
  const number = parseInt(value.length === 3 ? value.replace(/./g, '$&$&') : value, 16)
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255)
}

/** Text the standard PDF fonts can't encode (Arabic, emoji…) is drawn on a canvas and embedded as an image. */
async function textToPng(element) {
  const scale = 4
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(element.width * scale))
  canvas.height = Math.max(1, Math.ceil(element.height * scale))
  const context = canvas.getContext('2d')
  context.scale(scale, scale)
  context.fillStyle = element.color
  context.font = `${element.italic ? 'italic ' : ''}${element.bold ? '700 ' : '400 '}${element.fontSize}px ${cssFontFamily(element.fontFamily)}, "IBM Plex Sans Arabic", sans-serif`
  context.textBaseline = 'top'
  const rtl = /[֐-ࣿ]/.test(element.text)
  context.direction = rtl ? 'rtl' : 'ltr'
  const lines = wrapText(context, element.text, element.width)
  const lineHeight = element.fontSize * (element.lineHeight ?? 1.25)
  lines.forEach((line, index) => {
    const lineWidth = context.measureText(line).width
    const offset = element.align === 'center' ? (element.width - lineWidth) / 2 : element.align === 'right' ? element.width - lineWidth : 0
    // RTL text is drawn from its right edge.
    context.fillText(line, rtl ? offset + lineWidth : offset, index * lineHeight)
  })
  return new Uint8Array(await (await canvasToBlob(canvas, 'image/png')).arrayBuffer())
}

function wrapText(context, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      const candidate = line + word
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line.trimEnd())
        line = word.trimStart()
      } else line = candidate
    }
    lines.push(line)
  }
  return lines
}

/** Wrap with a pdf-lib font (width-aware). */
function wrapWithFont(font, size, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      const candidate = line + word
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line.trimEnd())
        line = word.trimStart()
      } else line = candidate
    }
    lines.push(line)
  }
  return lines
}

async function imageBytes(element) {
  const bitmap = await createImageBitmap(element.blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return new Uint8Array(await (await canvasToBlob(canvas, 'image/png')).arrayBuffer())
}

/**
 * Apply editor elements and save.
 * @param {File} file original PDF
 * @param {Record<number, object[]>} elementsByPage 0-based page index → elements
 */
export async function exportEditedPdf(file, elementsByPage, { onProgress } = {}) {
  const { StandardFonts, rgb, degrees, PDFName, PDFString, BlendMode } = await loadPdfLib()
  const doc = await openPdfDocument(file)
  const fontCache = {}
  const getFont = async (family, bold, italic) => {
    const name = FONT_NAMES[family]?.[(bold ? 1 : 0) + (italic ? 2 : 0)] ?? 'Helvetica'
    if (!fontCache[name]) fontCache[name] = await doc.embedFont(StandardFonts[name])
    return fontCache[name]
  }
  const pages = doc.getPages()
  const entries = Object.entries(elementsByPage).filter(([, list]) => list?.length)

  for (const [position, [pageKey, elements]] of entries.entries()) {
    const page = pages[Number(pageKey)]
    if (!page) continue
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const rotation = page.getRotation().angle % 360
    const box = page.getMediaBox()
    // Display (top-left, rotation applied) → PDF user space (bottom-left).
    const toPdf = (x, y) => {
      switch (rotation) {
        case 90:
          return [box.x + y, box.y + x]
        case 180:
          return [box.x + pageWidth - x, box.y + y]
        case 270:
          return [box.x + pageWidth - y, box.y + pageHeight - x]
        default:
          return [box.x + x, box.y + pageHeight - y]
      }
    }
    const turn = degrees(rotation)
    // Bottom-left corner of a display box, the anchor pdf-lib draws from (honouring page rotation).
    const anchor = (element) => {
      const corner = { 0: [element.x, element.y + element.height], 90: [element.x, element.y], 180: [element.x + element.width, element.y], 270: [element.x + element.width, element.y + element.height] }[rotation] ?? [element.x, element.y + element.height]
      return toPdf(...corner)
    }

    for (const element of elements) {
      const opacity = element.opacity ?? 1
      if (element.type === 'text') {
        const font = await getFont(element.fontFamily, element.bold, element.italic)
        let encodable = true
        try {
          font.encodeText(element.text)
        } catch {
          encodable = false
        }
        if (!encodable) {
          const png = await doc.embedPng(await textToPng(element))
          const [x, y] = anchor(element)
          page.drawImage(png, { x, y, width: element.width, height: element.height, rotate: turn, opacity })
          continue
        }
        if (element.background && element.background !== 'transparent') {
          const [x, y] = anchor(element)
          page.drawRectangle({ x, y, width: element.width, height: element.height, color: hexToRgb(element.background, rgb), rotate: turn, opacity })
        }
        const lineHeight = element.fontSize * (element.lineHeight ?? 1.25)
        const lines = wrapWithFont(font, element.fontSize, element.text, element.width)
        lines.forEach((line, index) => {
          const lineWidth = font.widthOfTextAtSize(line, element.fontSize)
          const offset = element.align === 'center' ? (element.width - lineWidth) / 2 : element.align === 'right' ? element.width - lineWidth : 0
          // Baseline ≈ top of line + ascent (0.8 em).
          const [x, y] = toPdf(element.x + offset, element.y + index * lineHeight + element.fontSize * 0.8)
          page.drawText(line, { x, y, size: element.fontSize, font, color: hexToRgb(element.color, rgb), rotate: turn, opacity })
          if (element.underline) {
            const [ux, uy] = toPdf(element.x + offset, element.y + index * lineHeight + element.fontSize * 0.92)
            page.drawLine({ start: { x: ux, y: uy }, end: { x: ux + lineWidth, y: uy }, thickness: Math.max(0.5, element.fontSize / 16), color: hexToRgb(element.color, rgb), opacity })
          }
        })
      } else if (element.type === 'image') {
        const image = await doc.embedPng(await imageBytes(element))
        const [x, y] = anchor(element)
        page.drawImage(image, { x, y, width: element.width, height: element.height, rotate: turn, opacity })
      } else if (element.type === 'rect' || element.type === 'whiteout' || element.type === 'highlight') {
        const [x, y] = anchor(element)
        const fill = element.type === 'whiteout' ? element.fill ?? '#FFFFFF' : element.fill
        page.drawRectangle({
          x,
          y,
          width: element.width,
          height: element.height,
          rotate: turn,
          color: fill && fill !== 'transparent' ? hexToRgb(fill, rgb) : undefined,
          opacity: element.type === 'highlight' ? (element.opacity ?? 0.4) : opacity,
          borderColor: element.type === 'rect' && element.strokeWidth > 0 ? hexToRgb(element.stroke, rgb) : undefined,
          borderWidth: element.type === 'rect' ? element.strokeWidth : 0,
          borderOpacity: opacity,
          blendMode: element.type === 'highlight' ? BlendMode.Multiply : undefined,
        })
      } else if (element.type === 'ellipse') {
        const [cx, cy] = toPdf(element.x + element.width / 2, element.y + element.height / 2)
        const sideways = rotation === 90 || rotation === 270
        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: (sideways ? element.height : element.width) / 2,
          yScale: (sideways ? element.width : element.height) / 2,
          color: element.fill && element.fill !== 'transparent' ? hexToRgb(element.fill, rgb) : undefined,
          opacity,
          borderColor: element.strokeWidth > 0 ? hexToRgb(element.stroke, rgb) : undefined,
          borderWidth: element.strokeWidth,
          borderOpacity: opacity,
        })
      } else if (element.type === 'line') {
        const [x1, y1] = toPdf(element.x1, element.y1)
        const [x2, y2] = toPdf(element.x2, element.y2)
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: element.strokeWidth, color: hexToRgb(element.stroke, rgb), opacity })
        if (element.arrow) {
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const size = Math.max(6, element.strokeWidth * 4)
          for (const side of [-1, 1]) {
            const theta = angle + Math.PI + (side * Math.PI) / 7
            page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 + Math.cos(theta) * size, y: y2 + Math.sin(theta) * size }, thickness: element.strokeWidth, color: hexToRgb(element.stroke, rgb), opacity })
          }
        }
      } else if (element.type === 'draw') {
        if (element.points.length < 2) continue
        for (let index = 1; index < element.points.length; index += 1) {
          const [x1, y1] = toPdf(...element.points[index - 1])
          const [x2, y2] = toPdf(...element.points[index])
          page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: element.strokeWidth, color: hexToRgb(element.stroke, rgb), opacity, lineCap: 1 })
        }
      } else if (element.type === 'link' && element.url) {
        const [x1, y1] = toPdf(element.x, element.y + element.height)
        const [x2, y2] = toPdf(element.x + element.width, element.y)
        const annotation = doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)],
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(element.url) },
        })
        const ref = doc.context.register(annotation)
        const annots = page.node.lookup(PDFName.of('Annots'))
        if (annots) annots.push(ref)
        else page.node.set(PDFName.of('Annots'), doc.context.obj([ref]))
      }
    }
    onProgress?.((position + 1) / Math.max(1, entries.length), 'processing')
  }

  doc.setProducer('Refract')
  const bytes = await doc.save({ useObjectStreams: true })
  return { blob: new Blob([bytes], { type: 'application/pdf' }), format: 'pdf', pages: pages.length }
}
