/** Compression quality presets (image). Values are 1–100. */
export const IMAGE_QUALITY_PRESETS = [
  { id: 'maximum', quality: 95 },
  { id: 'high', quality: 85 },
  { id: 'balanced', quality: 75 },
  { id: 'small', quality: 55 },
  { id: 'custom', quality: null },
]

export function getQualityPresetId(quality) {
  return IMAGE_QUALITY_PRESETS.find((preset) => preset.quality === quality)?.id ?? 'custom'
}

/** Social / web resize presets. */
export const RESIZE_PRESETS = [
  { id: 'instagram-post', width: 1080, height: 1080 },
  { id: 'instagram-story', width: 1080, height: 1920 },
  { id: 'facebook-post', width: 1200, height: 630 },
  { id: 'youtube-thumbnail', width: 1280, height: 720 },
  { id: 'twitter-post', width: 1600, height: 900 },
  { id: 'linkedin-post', width: 1200, height: 627 },
  { id: 'website-banner', width: 1920, height: 600 },
]

export const RESIZE_MODES = ['fit', 'fill', 'stretch']

/** Aspect ratios for crop tools. `null` = free. */
export const IMAGE_ASPECT_RATIOS = [
  { id: 'free', value: null, label: null },
  { id: '1:1', value: 1, label: '1:1' },
  { id: '4:3', value: 4 / 3, label: '4:3' },
  { id: '3:2', value: 3 / 2, label: '3:2' },
  { id: '16:9', value: 16 / 9, label: '16:9' },
  { id: '9:16', value: 9 / 16, label: '9:16' },
]

export const VIDEO_ASPECT_RATIOS = [
  { id: 'free', value: null, label: null },
  { id: '1:1', value: 1, label: '1:1' },
  { id: '4:3', value: 4 / 3, label: '4:3' },
  { id: '16:9', value: 16 / 9, label: '16:9' },
  { id: '9:16', value: 9 / 16, label: '9:16' },
]

export const VIDEO_CROP_PRESETS = [
  { id: 'instagram-reel', ratio: '9:16' },
  { id: 'tiktok', ratio: '9:16' },
  { id: 'youtube', ratio: '16:9' },
  { id: 'youtube-shorts', ratio: '9:16' },
  { id: 'instagram-story', ratio: '9:16' },
  { id: 'landscape', ratio: '16:9' },
  { id: 'square', ratio: '1:1' },
]

/** Video compression presets map to x264 CRF + encoder preset. */
export const VIDEO_COMPRESSION_PRESETS = [
  { id: 'best', crf: 20, preset: 'veryfast', audioBitrate: 192 },
  { id: 'high', crf: 24, preset: 'veryfast', audioBitrate: 160 },
  { id: 'balanced', crf: 28, preset: 'veryfast', audioBitrate: 128 },
  { id: 'maximum', crf: 33, preset: 'veryfast', audioBitrate: 96 },
  { id: 'custom', crf: null, preset: 'veryfast', audioBitrate: 128 },
]

export const VIDEO_RESOLUTIONS = [
  { id: 'original', height: null },
  { id: '2160', height: 2160, label: '4K' },
  { id: '1440', height: 1440, label: '1440p' },
  { id: '1080', height: 1080, label: '1080p' },
  { id: '720', height: 720, label: '720p' },
  { id: '480', height: 480, label: '480p' },
  { id: '360', height: 360, label: '360p' },
]

export const VIDEO_OUTPUT_FORMATS = [
  { id: 'mp4', label: 'MP4', mime: 'video/mp4', ext: 'mp4' },
  { id: 'webm', label: 'WebM', mime: 'video/webm', ext: 'webm' },
  { id: 'mov', label: 'MOV', mime: 'video/quicktime', ext: 'mov' },
  { id: 'avi', label: 'AVI', mime: 'video/x-msvideo', ext: 'avi' },
  { id: 'mkv', label: 'MKV', mime: 'video/x-matroska', ext: 'mkv' },
  { id: 'gif', label: 'GIF', mime: 'image/gif', ext: 'gif' },
]

export const AUDIO_OUTPUT_FORMATS = [
  { id: 'mp3', label: 'MP3', mime: 'audio/mpeg', ext: 'mp3' },
  { id: 'wav', label: 'WAV', mime: 'audio/wav', ext: 'wav' },
  { id: 'aac', label: 'AAC', mime: 'audio/aac', ext: 'm4a' },
]

export const VIDEO_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

export const GIF_FPS_OPTIONS = [8, 10, 12, 15, 20, 24]
export const GIF_WIDTH_OPTIONS = [240, 320, 480, 640, 800]

export const FRAME_FORMATS = [
  { id: 'jpeg', label: 'JPG' },
  { id: 'png', label: 'PNG' },
  { id: 'webp', label: 'WebP' },
]

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

export const WATERMARK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]
