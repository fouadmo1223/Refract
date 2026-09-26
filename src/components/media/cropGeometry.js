/** Pure crop-rectangle math shared by image and video crop tools. */

export function fullRect(width, height) {
  return { x: 0, y: 0, width, height }
}

/** Largest rect with `aspect` centered inside width × height (or the whole area when aspect is null). */
export function fitAspectRect(width, height, aspect, scale = 1) {
  if (!aspect) {
    const w = width * scale
    const h = height * scale
    return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
  }
  let w = width
  let h = w / aspect
  if (h > height) {
    h = height
    w = h * aspect
  }
  w *= scale
  h *= scale
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
}

export function clampRect(rect, bounds) {
  const width = Math.min(rect.width, bounds.width)
  const height = Math.min(rect.height, bounds.height)
  return {
    x: Math.min(Math.max(0, rect.x), bounds.width - width),
    y: Math.min(Math.max(0, rect.y), bounds.height - height),
    width,
    height,
  }
}

export function roundRect(rect) {
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
}

/**
 * Resize `start` by dragging `handle` (n, s, e, w, ne, nw, se, sw) by (dx, dy),
 * respecting bounds, minimum size and an optional aspect ratio.
 */
export function resizeRect(start, handle, dx, dy, bounds, aspect, minSize) {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height

  if (handle.includes('w')) left = Math.min(right - minSize, Math.max(0, left + dx))
  if (handle.includes('e')) right = Math.max(left + minSize, Math.min(bounds.width, right + dx))
  if (handle.includes('n')) top = Math.min(bottom - minSize, Math.max(0, top + dy))
  if (handle.includes('s')) bottom = Math.max(top + minSize, Math.min(bounds.height, bottom + dy))

  if (!aspect) return { x: left, y: top, width: right - left, height: bottom - top }

  const isCorner = handle.length === 2
  if (isCorner) {
    // Anchor the opposite corner; width drives height.
    const anchorX = handle.includes('w') ? start.x + start.width : start.x
    const anchorY = handle.includes('n') ? start.y + start.height : start.y
    const maxWidth = handle.includes('w') ? anchorX : bounds.width - anchorX
    const maxHeight = handle.includes('n') ? anchorY : bounds.height - anchorY
    let width = Math.max(minSize, right - left)
    width = Math.min(width, maxWidth, maxHeight * aspect)
    const height = width / aspect
    return {
      x: handle.includes('w') ? anchorX - width : anchorX,
      y: handle.includes('n') ? anchorY - height : anchorY,
      width,
      height,
    }
  }

  const centerX = start.x + start.width / 2
  const centerY = start.y + start.height / 2
  if (handle === 'e' || handle === 'w') {
    let width = right - left
    const maxHeight = 2 * Math.min(centerY, bounds.height - centerY)
    width = Math.min(width, maxHeight * aspect)
    const height = width / aspect
    return { x: handle === 'w' ? right - width : left, y: centerY - height / 2, width, height }
  }
  let height = bottom - top
  const maxWidth = 2 * Math.min(centerX, bounds.width - centerX)
  height = Math.min(height, maxWidth / aspect)
  const width = height * aspect
  return { x: centerX - width / 2, y: handle === 'n' ? bottom - height : top, width, height }
}
