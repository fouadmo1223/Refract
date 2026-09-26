import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, atempoChain, copyFormatFor, encodeArgsFor, reencodeFormatFor, seconds } from './encodingArgs'

/**
 * Repeat a video N times. `repeat` is a lossless stream copy; `boomerang`
 * plays forward then backward (re-encoded, no audio) and repeats that.
 */
export async function loopVideo(file, { loops, mode = 'repeat' }, meta, options = {}) {
  if (mode === 'boomerang') return boomerangVideo(file, loops, meta, options)
  const { onProgress, signal } = options
  const format = copyFormatFor(file)
  const output = `output.${format}`
  const expectedDuration = meta?.duration ? meta.duration * loops : undefined
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-stream_loop', String(loops - 1), '-i', input, '-c', 'copy', output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: expectedDuration }
}

async function boomerangVideo(file, loops, meta, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const expectedDuration = meta?.duration ? meta.duration * 2 * loops : undefined
  // The first and last frames are dropped from the reversed half so the turnarounds don't stutter.
  const graph = `[0:v]split[f][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1:a=0,loop=loop=${loops - 1}:size=32767:start=0,setpts=N/FRAME_RATE/TB,format=yuv420p[v]`
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-filter_complex', graph, '-map', '[v]', '-an', ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: expectedDuration }
}

/**
 * Play a video backwards. FFmpeg buffers every frame to reverse them, so
 * the UI recommends short clips (see REVERSE_RECOMMENDED_MAX_SECONDS).
 */
export const REVERSE_RECOMMENDED_MAX_SECONDS = 30

export async function reverseVideo(file, { reverseAudio, start = 0, end = null, speed = 1 }, meta, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const until = end ?? meta?.duration
  const part = until != null && (start > 0 || until < (meta?.duration ?? Infinity) - 0.05)
  const length = until != null ? (until - start) / speed : meta?.duration
  const video = ['reverse', ...(speed !== 1 ? [`setpts=PTS/${speed}`] : [])].join(',')
  const audio = ['areverse', ...(speed !== 1 ? [atempoChain(speed)] : [])].join(',')
  const blob = await runFFmpeg({
    inputs: [{ file }],
    // Reversing buffers every frame, so only the chosen part is decoded.
    buildArgs: ([input]) => [...(part ? ['-ss', seconds(start), '-t', seconds(until - start)] : []), '-i', input, '-vf', video, ...(reverseAudio ? ['-af', audio] : ['-an']), ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: length,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: length }
}
