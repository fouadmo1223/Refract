import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, h264Args } from './encodingArgs'

export const MOTION_EFFECTS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down']

const OUTPUT_SIZES = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
}
const FPS = 30
// Oversampling keeps sub-pixel zoom steps smooth without wasm-heavy 2× frames.
const OVERSAMPLE = 1.5

/** zoompan expressions; `on` is the output frame index, `d` the total frames. */
function zoompanFor(effect, frames) {
  const progress = `(on/${frames})`
  const center = { x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' }
  switch (effect) {
    case 'zoom-out':
      return { z: `1.35-0.35*${progress}`, ...center }
    case 'pan-left':
      return { z: '1.25', x: `(iw-iw/zoom)*(1-${progress})`, y: center.y }
    case 'pan-right':
      return { z: '1.25', x: `(iw-iw/zoom)*${progress}`, y: center.y }
    case 'pan-up':
      return { z: '1.25', x: center.x, y: `(ih-ih/zoom)*(1-${progress})` }
    case 'pan-down':
      return { z: '1.25', x: center.x, y: `(ih-ih/zoom)*${progress}` }
    case 'zoom-in':
    default:
      return { z: `1+0.35*${progress}`, ...center }
  }
}

/**
 * Turn a still image into a smooth motion video (Ken Burns effect) with FFmpeg,
 * entirely in the browser. The image is covered to the output aspect at 1.5×
 * resolution first so zooming stays sharp and jitter-free.
 *
 * @param {Blob} image
 * @param {{ effect: string, duration: number, aspect: '16:9'|'9:16'|'1:1'|'4:5' }} settings
 */
export async function createMotionVideo(image, { effect, duration, aspect }, { onProgress, signal } = {}) {
  const { width, height } = OUTPUT_SIZES[aspect] ?? OUTPUT_SIZES['16:9']
  const frames = Math.round(duration * FPS)
  const { z, x, y } = zoompanFor(effect, frames)
  const workWidth = Math.round((width * OVERSAMPLE) / 2) * 2
  const workHeight = Math.round((height * OVERSAMPLE) / 2) * 2
  const filter = [
    `scale=${workWidth}:${workHeight}:force_original_aspect_ratio=increase`,
    `crop=${workWidth}:${workHeight}`,
    `zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${width}x${height}:fps=${FPS}`,
    'format=yuv420p',
  ].join(',')
  const output = 'output.mp4'
  const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1] || 'png'

  const blob = await runFFmpeg({
    inputs: [{ file: image, name: `image.${extension}` }],
    buildArgs: ([input]) => ['-i', input, '-vf', filter, '-frames:v', String(frames), ...h264Args({ crf: 20 }), '-movflags', '+faststart', output],
    output,
    outputType: OUTPUT_TYPES.mp4,
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { blob, format: 'mp4', width, height, duration }
}
