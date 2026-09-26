import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Renders a canvas produced by `draw()` into a visible <canvas>.
 * `draw` must return an HTMLCanvasElement / OffscreenCanvas / ImageBitmap.
 * Redraws are coalesced to one per animation frame.
 */
export function CanvasView({ draw, deps, className, style, label }) {
  const canvasRef = useRef(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = canvasRef.current
      const source = drawRef.current()
      if (!target || !source) return
      if (target.width !== source.width) target.width = source.width
      if (target.height !== source.height) target.height = source.height
      const context = target.getContext('2d')
      context.clearRect(0, 0, target.width, target.height)
      context.drawImage(source, 0, 0)
    })
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return <canvas ref={canvasRef} role={label ? 'img' : undefined} aria-label={label} className={cn('block', className)} style={style} />
}
