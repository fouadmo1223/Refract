import { probeMedia, runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, even, h264Args, aacArgs } from './encodingArgs'

/**
 * Merge clips in order. Every clip is scaled/padded to the first clip's frame
 * size and 30 fps so the concat filter accepts them. Audio is kept only when
 * every clip has an audio track (reported back via `audioDropped`).
 */
export async function mergeVideos(files, { onProgress, signal } = {}) {
  onProgress?.(null, 'analyzing')
  const probes = []
  for (const file of files) probes.push(await probeMedia(file, { signal }))
  const width = even(probes[0].width || 1280)
  const height = even(probes[0].height || 720)
  const withAudio = probes.every((probe) => probe.hasAudio)
  const totalDuration = probes.reduce((sum, probe) => sum + (probe.duration ?? 0), 0)

  const filters = probes.map(
    (_, index) =>
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${index}]` +
      (withAudio ? `;[${index}:a]aresample=44100,aformat=channel_layouts=stereo[a${index}]` : ''),
  )
  const concatInputs = probes.map((_, index) => (withAudio ? `[v${index}][a${index}]` : `[v${index}]`)).join('')
  const graph = `${filters.join(';')};${concatInputs}concat=n=${files.length}:v=1:a=${withAudio ? 1 : 0}[v]${withAudio ? '[a]' : ''}`
  const output = 'output.mp4'

  const blob = await runFFmpeg({
    inputs: files.map((file) => ({ file })),
    buildArgs: (inputs) => [
      ...inputs.flatMap((input) => ['-i', input]),
      '-filter_complex', graph,
      '-map', '[v]', ...(withAudio ? ['-map', '[a]'] : []),
      ...h264Args(), ...(withAudio ? aacArgs(160) : []),
      '-movflags', '+faststart', output,
    ],
    output,
    outputType: OUTPUT_TYPES.mp4,
    expectedDuration: totalDuration || undefined,
    onProgress,
    signal,
  })
  return { blob, format: 'mp4', width, height, duration: totalDuration, audioDropped: !withAudio && probes.some((probe) => probe.hasAudio) }
}
