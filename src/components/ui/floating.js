import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'

/**
 * Shared floating-element positioning (dropdowns, selects, tooltips, popovers).
 * floating-ui resolves `-start`/`-end` against the document direction, so
 * menus align correctly in RTL.
 */
export function useFloatingPosition({ open, placement = 'bottom-start', gap = 6, matchWidth = false, maxHeight = 320 }) {
  return useFloating({
    open,
    placement,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(gap),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(maxHeight, Math.max(120, availableHeight))}px`,
            ...(matchWidth ? { minWidth: `${rects.reference.width}px` } : {}),
          })
        },
      }),
    ],
  })
}
