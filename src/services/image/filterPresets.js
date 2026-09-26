import { DEFAULT_ADJUSTMENTS } from './adjustments'

/**
 * Photo filter looks, expressed as adjustment values so they reuse the
 * editor's pixel pipeline (identical preview and export).
 */
export const FILTER_PRESETS = {
  none: {},
  vivid: { saturation: 35, contrast: 15, highlights: -10 },
  warm: { temperature: 35, saturation: 10, brightness: 4 },
  cool: { temperature: -35, tint: -5, contrast: 6 },
  vintage: { temperature: 25, saturation: -30, contrast: -12, highlights: -20, shadows: 20, vignette: 45 },
  fade: { contrast: -28, brightness: 8, saturation: -20, shadows: 25 },
  noir: { saturation: -100, contrast: 40, shadows: -15, vignette: 35 },
  mono: { saturation: -100, contrast: 8 },
  dramatic: { contrast: 45, saturation: 15, highlights: -30, shadows: -20, vignette: 30 },
  golden: { temperature: 45, tint: 8, saturation: 20, exposure: 6, highlights: -10 },
  cinematic: { temperature: -10, tint: 6, contrast: 22, saturation: -15, shadows: 12, vignette: 25 },
}

export const FILTER_IDS = Object.keys(FILTER_PRESETS)

/** Scale a preset by intensity (0–100) into a full adjustments object. */
export function presetToAdjustments(presetId, intensity = 100) {
  const preset = FILTER_PRESETS[presetId] ?? {}
  const factor = intensity / 100
  const adjustments = { ...DEFAULT_ADJUSTMENTS }
  for (const [key, value] of Object.entries(preset)) adjustments[key] = Math.round(value * factor)
  return adjustments
}
