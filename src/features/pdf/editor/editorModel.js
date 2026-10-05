let counter = 0
export const newId = () => `el-${Date.now().toString(36)}-${(counter += 1)}`

export const TOOLS = ['select', 'editText', 'text', 'image', 'rect', 'ellipse', 'line', 'arrow', 'highlight', 'whiteout', 'link', 'draw']

/** Style remembered per tool so the next element looks like the last one. */
export const DEFAULT_STYLE = {
  fontFamily: 'helvetica',
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
  color: '#111111',
  align: 'left',
  lineHeight: 1.25,
  fill: 'transparent',
  stroke: '#E11D48',
  strokeWidth: 2,
  opacity: 1,
  highlight: '#FDE047',
}

export const COLOR_SWATCHES = ['#111111', '#FFFFFF', '#E11D48', '#EA580C', '#FDE047', '#16A34A', '#2563EB', '#7C3AED']

/** Create an element from a dragged box (display points). */
export function createElement(tool, box, style) {
  const base = { id: newId(), x: box.x, y: box.y, width: Math.max(box.width, 8), height: Math.max(box.height, 8), opacity: 1 }
  switch (tool) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: '',
        width: Math.max(box.width, 140),
        height: Math.max(box.height, style.fontSize * 1.6),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        bold: style.bold,
        italic: style.italic,
        underline: style.underline,
        color: style.color,
        align: style.align,
        lineHeight: style.lineHeight,
        background: 'transparent',
      }
    case 'rect':
      return { ...base, type: 'rect', fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth }
    case 'ellipse':
      return { ...base, type: 'ellipse', fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth }
    case 'highlight':
      return { ...base, type: 'highlight', fill: style.highlight, opacity: 0.4 }
    case 'whiteout':
      return { ...base, type: 'whiteout', fill: '#FFFFFF' }
    case 'link':
      return { ...base, type: 'link', url: 'https://' }
    default:
      return null
  }
}

export function createLine(tool, from, to, style) {
  return { id: newId(), type: 'line', arrow: tool === 'arrow', x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: style.stroke, strokeWidth: style.strokeWidth, opacity: 1 }
}

/** Bounding box of any element (lines and drawings have no x/y/width/height of their own). */
export function boundsOf(element) {
  if (element.type === 'line') {
    const x = Math.min(element.x1, element.x2)
    const y = Math.min(element.y1, element.y2)
    return { x, y, width: Math.abs(element.x2 - element.x1), height: Math.abs(element.y2 - element.y1) }
  }
  if (element.type === 'draw') {
    const xs = element.points.map(([x]) => x)
    const ys = element.points.map(([, y]) => y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
  }
  return { x: element.x, y: element.y, width: element.width, height: element.height }
}

/** Move any element by (dx, dy). */
export function translate(element, dx, dy) {
  if (element.type === 'line') return { ...element, x1: element.x1 + dx, y1: element.y1 + dy, x2: element.x2 + dx, y2: element.y2 + dy }
  if (element.type === 'draw') return { ...element, points: element.points.map(([x, y]) => [x + dx, y + dy]) }
  return { ...element, x: element.x + dx, y: element.y + dy }
}
