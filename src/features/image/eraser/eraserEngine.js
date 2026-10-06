import { canvasToBlob, decodeImage } from '@/services/image/canvas'

const HISTORY_LIMIT = 30

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * Non-destructive eraser: the photo is never touched, every edit goes into an
 * alpha mask (opaque = keep, transparent = erased). Brush strokes are painted
 * on a scratch layer first so a stroke's strength stays even where it overlaps
 * itself, then merged into the mask on release. Undo history stores only the
 * mask's alpha channel.
 *
 * The engine lives outside React so the mask survives the preview unmounting
 * while an export runs.
 */
export class EraserEngine {
  constructor(bitmap) {
    this.width = bitmap.width
    this.height = bitmap.height
    this.image = makeCanvas(this.width, this.height)
    this.image.getContext('2d').drawImage(bitmap, 0, 0)
    this.mask = makeCanvas(this.width, this.height)
    this.maskContext = this.mask.getContext('2d', { willReadFrequently: true })
    this.fillMask()
    this.stroke = makeCanvas(this.width, this.height)
    this.strokeContext = this.stroke.getContext('2d')
    this.scratch = makeCanvas(this.width, this.height)
    this.undoStack = []
    this.redoStack = []
    this.pixels = null
    this.listeners = new Set()
    this.activeStroke = null
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit() {
    this.listeners.forEach((listener) => listener())
  }

  get canUndo() {
    return this.undoStack.length > 0
  }

  get canRedo() {
    return this.redoStack.length > 0
  }

  fillMask(alpha = 1) {
    this.maskContext.save()
    this.maskContext.globalCompositeOperation = 'copy'
    this.maskContext.fillStyle = `rgba(255,255,255,${alpha})`
    this.maskContext.fillRect(0, 0, this.width, this.height)
    this.maskContext.restore()
  }

  readAlpha() {
    const { data } = this.maskContext.getImageData(0, 0, this.width, this.height)
    const alpha = new Uint8ClampedArray(this.width * this.height)
    for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * 4 + 3]
    return alpha
  }

  writeAlpha(alpha) {
    const image = new ImageData(this.width, this.height)
    for (let index = 0; index < alpha.length; index += 1) {
      const offset = index * 4
      image.data[offset] = 255
      image.data[offset + 1] = 255
      image.data[offset + 2] = 255
      image.data[offset + 3] = alpha[index]
    }
    this.maskContext.putImageData(image, 0, 0)
  }

  checkpoint() {
    this.undoStack.push(this.readAlpha())
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
    this.redoStack = []
  }

  undo() {
    if (!this.canUndo) return
    this.redoStack.push(this.readAlpha())
    this.writeAlpha(this.undoStack.pop())
    this.emit()
  }

  redo() {
    if (!this.canRedo) return
    this.undoStack.push(this.readAlpha())
    this.writeAlpha(this.redoStack.pop())
    this.emit()
  }

  /** Apply a whole-mask edit as one undoable step. */
  edit(apply) {
    this.checkpoint()
    apply()
    this.emit()
  }

  restoreAll() {
    this.edit(() => this.fillMask(1))
  }

  eraseAll() {
    this.edit(() => this.fillMask(0))
  }

  invert() {
    this.edit(() => {
      const alpha = this.readAlpha()
      for (let index = 0; index < alpha.length; index += 1) alpha[index] = 255 - alpha[index]
      this.writeAlpha(alpha)
    })
  }

  /** Soften the mask edge (feather) by blurring it once. */
  feather(radius) {
    this.edit(() => {
      const context = this.scratch.getContext('2d')
      context.clearRect(0, 0, this.width, this.height)
      context.drawImage(this.mask, 0, 0)
      this.maskContext.save()
      this.maskContext.globalCompositeOperation = 'copy'
      this.maskContext.filter = `blur(${radius}px)`
      this.maskContext.drawImage(this.scratch, 0, 0)
      this.maskContext.restore()
    })
  }

  // ------------------------------------------------------------- brush

  beginStroke(point, brush) {
    this.checkpoint()
    this.activeStroke = { ...brush, last: point }
    this.strokeContext.clearRect(0, 0, this.width, this.height)
    this.stamp(point)
    this.emit()
  }

  moveStroke(point) {
    const stroke = this.activeStroke
    if (!stroke) return
    const { last } = stroke
    const distance = Math.hypot(point.x - last.x, point.y - last.y)
    const spacing = Math.max(1, stroke.size * 0.12)
    const steps = Math.floor(distance / spacing)
    for (let step = 1; step <= steps; step += 1) {
      const ratio = (step * spacing) / distance
      this.stamp({ x: last.x + (point.x - last.x) * ratio, y: last.y + (point.y - last.y) * ratio })
    }
    if (steps > 0) stroke.last = { x: last.x + ((point.x - last.x) * steps * spacing) / distance, y: last.y + ((point.y - last.y) * steps * spacing) / distance }
    this.emit()
  }

  endStroke() {
    if (!this.activeStroke) return
    this.applyStrokeTo(this.maskContext)
    this.strokeContext.clearRect(0, 0, this.width, this.height)
    this.activeStroke = null
    this.emit()
  }

  stamp({ x, y }) {
    const { size, hardness } = this.activeStroke
    const radius = size / 2
    const context = this.strokeContext
    const gradient = context.createRadialGradient(x, y, radius * Math.min(0.99, hardness / 100), x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  applyStrokeTo(context) {
    const { mode, strength } = this.activeStroke
    context.save()
    context.globalAlpha = strength / 100
    context.globalCompositeOperation = mode === 'restore' ? 'source-over' : 'destination-out'
    context.drawImage(this.stroke, 0, 0)
    context.restore()
  }

  // ------------------------------------------------------------- magic wand

  sourcePixels() {
    if (!this.pixels) this.pixels = this.image.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, this.width, this.height).data
    return this.pixels
  }

  /** Select pixels similar to the clicked color (flood fill or whole image) and erase / restore them. */
  wand(point, { tolerance, contiguous, mode, smooth }) {
    const data = this.sourcePixels()
    const { width, height } = this
    const seedX = Math.min(width - 1, Math.max(0, Math.round(point.x)))
    const seedY = Math.min(height - 1, Math.max(0, Math.round(point.y)))
    const seed = (seedY * width + seedX) * 4
    const [r, g, b] = [data[seed], data[seed + 1], data[seed + 2]]
    // Tolerance 0–100 maps onto RGB distance (max ≈ 441).
    const limit = ((tolerance / 100) * 441) ** 2
    const matches = (pixel) => {
      const offset = pixel * 4
      const dr = data[offset] - r
      const dg = data[offset + 1] - g
      const db = data[offset + 2] - b
      return dr * dr + dg * dg + db * db <= limit
    }
    const selected = new Uint8Array(width * height)
    if (contiguous) {
      const stack = new Int32Array(width * height)
      let top = 0
      stack[top++] = seedY * width + seedX
      selected[seedY * width + seedX] = 1
      while (top > 0) {
        const pixel = stack[--top]
        const x = pixel % width
        const neighbours = [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, pixel - width, pixel + width]
        for (const next of neighbours) {
          if (next < 0 || next >= selected.length || selected[next] || !matches(next)) continue
          selected[next] = 1
          stack[top++] = next
        }
      }
    } else {
      for (let pixel = 0; pixel < selected.length; pixel += 1) if (matches(pixel)) selected[pixel] = 1
    }

    const selection = new ImageData(width, height)
    for (let pixel = 0; pixel < selected.length; pixel += 1) {
      if (!selected[pixel]) continue
      const offset = pixel * 4
      selection.data[offset] = 255
      selection.data[offset + 1] = 255
      selection.data[offset + 2] = 255
      selection.data[offset + 3] = 255
    }
    const scratch = this.scratch.getContext('2d')
    scratch.putImageData(selection, 0, 0)

    this.edit(() => {
      this.maskContext.save()
      this.maskContext.globalCompositeOperation = mode === 'restore' ? 'source-over' : 'destination-out'
      this.maskContext.drawImage(this.scratch, 0, 0)
      // The sharp pass fully covers the selection; the blurred pass only adds a soft fringe
      // (blurring alone would leave a faint frame along the image border).
      if (smooth) {
        this.maskContext.filter = 'blur(0.8px)'
        this.maskContext.drawImage(this.scratch, 0, 0)
      }
      this.maskContext.restore()
    })
  }

  // ------------------------------------------------------------- output

  /** Draw the current result (mask + live stroke) into a display canvas. */
  render(target, view) {
    const context = target.getContext('2d')
    if (target.width !== this.width || target.height !== this.height) {
      target.width = this.width
      target.height = this.height
    }
    let mask = this.mask
    if (this.activeStroke) {
      const scratch = this.scratch.getContext('2d')
      scratch.save()
      scratch.globalCompositeOperation = 'copy'
      scratch.drawImage(this.mask, 0, 0)
      scratch.restore()
      this.applyStrokeTo(scratch)
      mask = this.scratch
    }
    context.save()
    context.globalCompositeOperation = 'copy'
    context.drawImage(this.image, 0, 0)
    context.restore()
    if (view === 'tint') {
      // Whole photo stays visible: tint it red, then lay the kept pixels back on top untinted.
      context.save()
      context.globalAlpha = 0.55
      context.globalCompositeOperation = 'source-atop'
      context.fillStyle = '#ef4444'
      context.fillRect(0, 0, this.width, this.height)
      context.restore()
      context.drawImage(this.maskedImage(mask), 0, 0)
      return
    }
    context.save()
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(mask, 0, 0)
    context.restore()
  }

  maskedImage(mask) {
    if (!this.maskedCanvas) this.maskedCanvas = makeCanvas(this.width, this.height)
    const context = this.maskedCanvas.getContext('2d')
    context.save()
    context.globalCompositeOperation = 'copy'
    context.drawImage(this.image, 0, 0)
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(mask, 0, 0)
    context.restore()
    return this.maskedCanvas
  }

  /** Bounding box of the kept pixels in mask coordinates, or null when everything is erased. */
  contentBounds() {
    const alpha = this.readAlpha()
    let minX = this.width
    let minY = this.height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (alpha[y * this.width + x] < 8) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  }

  /**
   * Export at the file's full resolution: the working-size mask is scaled up
   * (smoothly, so edges stay soft) and applied to the original pixels.
   */
  async export(file, { format, quality, trim, padding }) {
    const full = await decodeImage(file)
    const width = full.width
    const height = full.height
    const canvas = makeCanvas(width, height)
    const context = canvas.getContext('2d')
    context.drawImage(full, 0, 0)
    full.close?.()
    context.globalCompositeOperation = 'destination-in'
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(this.mask, 0, 0, width, height)
    context.globalCompositeOperation = 'source-over'

    let output = canvas
    if (trim) {
      const bounds = this.contentBounds()
      if (bounds) {
        const scale = width / this.width
        const pad = Math.round(padding ?? 0)
        const x = Math.max(0, Math.floor(bounds.x * scale) - pad)
        const y = Math.max(0, Math.floor(bounds.y * scale) - pad)
        const right = Math.min(width, Math.ceil((bounds.x + bounds.width) * scale) + pad)
        const bottom = Math.min(height, Math.ceil((bounds.y + bounds.height) * scale) + pad)
        output = makeCanvas(right - x, bottom - y)
        output.getContext('2d').drawImage(canvas, x, y, right - x, bottom - y, 0, 0, right - x, bottom - y)
      }
    }
    const mime = format === 'webp' ? 'image/webp' : 'image/png'
    const blob = await canvasToBlob(output, mime, (quality ?? 92) / 100)
    return { blob, width: output.width, height: output.height, format }
  }
}
