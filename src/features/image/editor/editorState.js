import { DEFAULT_ADJUSTMENTS, isDefaultAdjustments } from '@/services/image/adjustments'

export const INITIAL_EDITOR_STATE = {
  adjustments: DEFAULT_ADJUSTMENTS,
  transform: { rotation: 0, flipH: false, flipV: false },
  crop: null, // { x, y, width, height } in full-resolution pixels of the transformed image
  resize: null, // { width, height } applied last
}

export const ADJUSTMENT_GROUPS = [
  { id: 'light', keys: ['exposure', 'brightness', 'contrast', 'highlights', 'shadows'] },
  { id: 'color', keys: ['saturation', 'temperature', 'tint'] },
  { id: 'detail', keys: ['sharpen', 'blur', 'opacity'] },
]

export function isPristine(state) {
  return (
    isDefaultAdjustments(state.adjustments) &&
    state.transform.rotation === 0 &&
    !state.transform.flipH &&
    !state.transform.flipV &&
    !state.crop &&
    !state.resize
  )
}

/** Full-resolution size after transform + crop (before resize). */
export function getEditedBaseSize(meta, state) {
  if (state.crop) return { width: Math.round(state.crop.width), height: Math.round(state.crop.height) }
  const swapped = state.transform.rotation % 180 !== 0
  return swapped ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height }
}

export function getEditedOutputSize(meta, state) {
  return state.resize ?? getEditedBaseSize(meta, state)
}
