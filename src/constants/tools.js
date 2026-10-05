import {
  AudioLines,
  Binary,
  Clapperboard,
  Contrast,
  EyeOff,
  Frame,
  LayoutGrid,
  Palette,
  PenTool,
  RectangleVertical,
  Smartphone,
  SplitSquareHorizontal,
  Sunset,
  Type,
  Crop,
  Droplets,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  FlipHorizontal2,
  Gauge,
  Grid2x2,
  Image as ImageIcon,
  ImageDown,
  ImagePlay,
  Layers,
  Merge,
  Minimize2,
  Music,
  Pipette,
  Repeat2,
  Rewind,
  RotateCw,
  Scaling,
  Sparkles,
  WandSparkles,
  Scissors,
  SlidersHorizontal,
  Stamp,
  Timer,
  VolumeX,
  GalleryHorizontalEnd,
  FileVideo,
  FilePen,
  FileStack,
  FileDown,
  Images,
  FileUser,
  Code2,
  Camera,
} from 'lucide-react'

/**
 * Tool registry — the single source of truth for navigation, search,
 * category listings and route generation.
 *
 * - `category`: which media family the tool belongs to ('image' | 'video')
 * - `groups`:   cross-cutting categories used for filtering ('compress' | 'convert' | 'edit')
 * - `processing`: 'local' (default — runs in the browser) | 'server' (sends data to a cloud API)
 * - `status`:  'ready' | 'soon' — "soon" tools are listed but not routed.
 * - `keywords`: extra English search terms (localized keywords live in locale files).
 */
export const TOOLS = [
  // ---------------------------------------------------------------- Image
  { id: 'image-compress', category: 'image', groups: ['compress'], path: '/image/compress', icon: Minimize2, popular: true, keywords: ['compress', 'reduce', 'optimize', 'jpg', 'png', 'webp', 'avif', 'size', 'tinypng'] },
  { id: 'image-convert', category: 'image', groups: ['convert'], path: '/image/convert', icon: Repeat2, popular: true, keywords: ['convert', 'jpg', 'png', 'webp', 'avif', 'bmp', 'gif', 'format'] },
  { id: 'image-resize', category: 'image', groups: ['edit'], path: '/image/resize', icon: Scaling, popular: true, keywords: ['resize', 'scale', 'dimensions', 'instagram', 'youtube', 'thumbnail'] },
  { id: 'image-crop', category: 'image', groups: ['edit'], path: '/image/crop', icon: Crop, popular: true, keywords: ['crop', 'cut', 'aspect', 'ratio', 'trim'] },
  { id: 'image-remove-bg', category: 'image', groups: ['edit'], path: '/image/remove-background', icon: Eraser, popular: true, keywords: ['remove background', 'background', 'transparent', 'cutout', 'bg'] },
  { id: 'image-editor', category: 'image', groups: ['edit'], path: '/image/editor', icon: SlidersHorizontal, keywords: ['edit', 'editor', 'brightness', 'contrast', 'saturation', 'filter', 'adjust'] },
  { id: 'image-watermark', category: 'image', groups: ['edit'], path: '/image/watermark', icon: Stamp, keywords: ['watermark', 'logo', 'text', 'copyright', 'stamp'] },
  { id: 'image-metadata', category: 'image', groups: ['edit'], path: '/image/metadata', icon: FileText, keywords: ['metadata', 'exif', 'gps', 'privacy', 'strip', 'remove'] },
  { id: 'image-batch', category: 'image', groups: ['compress', 'convert'], path: '/image/batch', icon: Layers, keywords: ['batch', 'bulk', 'multiple', 'zip', 'many'] },
  { id: 'image-to-base64', category: 'image', groups: ['convert'], path: '/image/to-base64', icon: Binary, keywords: ['base64', 'data uri', 'encode'] },
  { id: 'base64-to-image', category: 'image', groups: ['convert'], path: '/image/from-base64', icon: FileImage, keywords: ['base64', 'decode', 'data uri'] },
  { id: 'image-ico', category: 'image', groups: ['convert'], path: '/image/ico', icon: Grid2x2, keywords: ['ico', 'favicon', 'icon'] },
  { id: 'svg-to-png', category: 'image', groups: ['convert'], path: '/image/svg-to-png', icon: FileCode2, keywords: ['svg', 'png', 'vector', 'rasterize'] },
  { id: 'png-to-svg', category: 'image', groups: ['convert'], path: '/image/png-to-svg', icon: PenTool, keywords: ['svg', 'vectorize', 'trace', 'vector', 'png to svg', 'jpg to svg', 'logo'] },
  { id: 'html-to-image', category: 'image', groups: ['convert'], path: '/image/html-to-image', icon: Camera, keywords: ['html', 'css', 'html to image', 'screenshot', 'code to image', 'og image', 'snapshot'] },
  { id: 'image-to-html', category: 'image', groups: ['convert'], path: '/image/to-html', icon: Code2, keywords: ['html', 'css', 'image to html', 'screenshot to code', 'design to code', 'tailwind', 'pixel art'] },
  { id: 'heic-to-jpg', category: 'image', groups: ['convert'], path: '/image/heic-to-jpg', icon: Smartphone, popular: true, keywords: ['heic', 'heif', 'iphone', 'jpg', 'apple', 'ios'] },
  { id: 'image-text', category: 'image', groups: ['edit'], path: '/image/add-text', icon: Type, keywords: ['text', 'meme', 'caption', 'title', 'write', 'quote'] },
  { id: 'image-censor', category: 'image', groups: ['edit'], path: '/image/censor', icon: EyeOff, keywords: ['censor', 'blur face', 'hide', 'redact', 'license plate', 'privacy', 'pixelate area'] },
  { id: 'image-collage', category: 'image', groups: ['edit'], path: '/image/collage', icon: LayoutGrid, keywords: ['collage', 'grid', 'merge images', 'combine', 'photo grid'] },
  { id: 'image-border', category: 'image', groups: ['edit'], path: '/image/border', icon: Frame, keywords: ['border', 'frame', 'padding', 'rounded corners', 'shadow', 'outline'] },
  { id: 'image-filters', category: 'image', groups: ['edit'], path: '/image/filters', icon: Palette, keywords: ['filter', 'preset', 'vintage', 'noir', 'sepia', 'effect', 'look'] },
  { id: 'image-color-picker', category: 'image', groups: ['edit'], path: '/image/color-picker', icon: Pipette, keywords: ['color', 'picker', 'hex', 'palette', 'eyedropper'] },
  { id: 'image-blur', category: 'image', groups: ['edit'], path: '/image/blur', icon: Droplets, keywords: ['blur', 'soften', 'gaussian'] },
  { id: 'image-pixelate', category: 'image', groups: ['edit'], path: '/image/pixelate', icon: Grid2x2, keywords: ['pixelate', 'mosaic', 'censor'] },
  { id: 'image-grayscale', category: 'image', groups: ['edit'], path: '/image/grayscale', icon: Contrast, keywords: ['grayscale', 'black and white', 'monochrome', 'bw'] },
  { id: 'image-rotate', category: 'image', groups: ['edit'], path: '/image/rotate', icon: RotateCw, keywords: ['rotate', 'turn', 'orientation'] },
  { id: 'image-flip', category: 'image', groups: ['edit'], path: '/image/flip', icon: FlipHorizontal2, keywords: ['flip', 'mirror'] },

  // ---------------------------------------------------------------- AI (cloud)
  { id: 'ai-image', category: 'ai', groups: ['generate'], path: '/ai/image', icon: Sparkles, popular: true, processing: 'server', keywords: ['ai', 'generate', 'text to image', 'prompt', 'flux', 'art', 'create image'] },
  { id: 'ai-video', category: 'ai', groups: ['generate'], path: '/ai/video', icon: WandSparkles, processing: 'server', keywords: ['ai', 'generate', 'text to video', 'animate', 'image to video', 'create video', 'motion'] },

  // ---------------------------------------------------------------- Video
  { id: 'video-compress', category: 'video', groups: ['compress'], path: '/video/compress', icon: Minimize2, popular: true, keywords: ['compress', 'reduce', 'shrink', 'mp4', 'size', 'bitrate'] },
  { id: 'video-convert', category: 'video', groups: ['convert'], path: '/video/convert', icon: Repeat2, popular: true, keywords: ['convert', 'mp4', 'webm', 'mov', 'avi', 'mkv', 'format'] },
  { id: 'video-trim', category: 'video', groups: ['edit'], path: '/video/trim', icon: Scissors, popular: true, keywords: ['trim', 'cut', 'clip', 'shorten'] },
  { id: 'video-crop', category: 'video', groups: ['edit'], path: '/video/crop', icon: Crop, keywords: ['crop', 'reel', 'tiktok', 'shorts', 'aspect'] },
  { id: 'video-resize', category: 'video', groups: ['edit'], path: '/video/resize', icon: Scaling, keywords: ['resize', 'resolution', '1080p', '720p', '4k', 'scale'] },
  { id: 'video-mute', category: 'video', groups: ['edit'], path: '/video/mute', icon: VolumeX, keywords: ['mute', 'remove audio', 'silent', 'sound'] },
  { id: 'video-extract-audio', category: 'video', groups: ['convert'], path: '/video/extract-audio', icon: Music, keywords: ['extract audio', 'video to audio', 'mp3', 'wav', 'aac', 'sound'] },
  { id: 'video-speed', category: 'video', groups: ['edit'], path: '/video/speed', icon: Gauge, keywords: ['speed', 'slow motion', 'fast', 'timelapse'] },
  { id: 'video-rotate', category: 'video', groups: ['edit'], path: '/video/rotate', icon: RotateCw, keywords: ['rotate', 'flip', 'orientation', 'mirror'] },
  { id: 'video-to-gif', category: 'video', groups: ['convert'], path: '/video/to-gif', icon: ImagePlay, keywords: ['gif', 'animated', 'video to gif'] },
  { id: 'gif-to-video', category: 'video', groups: ['convert'], path: '/video/from-gif', icon: FileVideo, keywords: ['gif', 'mp4', 'webm', 'gif to video'] },
  { id: 'video-thumbnail', category: 'video', groups: ['edit'], path: '/video/thumbnail', icon: ImageDown, keywords: ['thumbnail', 'frame', 'screenshot', 'still', 'poster'] },
  { id: 'video-loop', category: 'video', groups: ['edit'], path: '/video/loop', icon: Repeat2, keywords: ['loop', 'repeat'] },
  { id: 'video-reverse', category: 'video', groups: ['edit'], path: '/video/reverse', icon: Rewind, keywords: ['reverse', 'backwards', 'rewind'] },
  { id: 'video-fps', category: 'video', groups: ['convert'], path: '/video/fps', icon: Timer, keywords: ['fps', 'frame rate', 'framerate'] },
  { id: 'video-frames', category: 'video', groups: ['convert'], path: '/video/extract-frames', icon: GalleryHorizontalEnd, keywords: ['frames', 'extract', 'images', 'sequence'] },
  { id: 'video-merge', category: 'video', groups: ['edit'], path: '/video/merge', icon: Merge, keywords: ['merge', 'join', 'combine', 'concat'] },
  { id: 'video-text', category: 'video', groups: ['edit'], path: '/video/add-text', icon: Type, keywords: ['text', 'title', 'caption', 'subtitle', 'overlay'] },
  { id: 'video-watermark', category: 'video', groups: ['edit'], path: '/video/watermark', icon: Stamp, keywords: ['watermark', 'logo', 'brand', 'overlay'] },
  { id: 'video-censor', category: 'video', groups: ['edit'], path: '/video/censor', icon: EyeOff, keywords: ['censor', 'blur', 'pixelate', 'hide', 'redact', 'blur face'] },
  { id: 'video-filters', category: 'video', groups: ['edit'], path: '/video/filters', icon: Palette, keywords: ['filter', 'color', 'brightness', 'contrast', 'saturation', 'grayscale', 'vintage', 'correct'] },
  { id: 'video-fit', category: 'video', groups: ['edit'], path: '/video/fit-background', icon: RectangleVertical, popular: false, keywords: ['blur background', 'fit', 'reels', 'tiktok', 'vertical', '9:16', 'no crop', 'pad'] },
  { id: 'video-split', category: 'video', groups: ['edit'], path: '/video/split', icon: SplitSquareHorizontal, keywords: ['split', 'cut into parts', 'segments', 'divide', 'chunks'] },
  { id: 'video-fade', category: 'video', groups: ['edit'], path: '/video/fade', icon: Sunset, keywords: ['fade', 'fade in', 'fade out', 'transition'] },
  { id: 'video-add-audio', category: 'video', groups: ['edit'], path: '/video/add-audio', icon: AudioLines, keywords: ['add audio', 'music', 'soundtrack', 'replace audio'] },
  // ---------------------------------------------------------------- PDF & documents
  { id: 'resume-builder', category: 'pdf', groups: ['generate'], path: '/resume', icon: FileUser, popular: true, keywords: ['resume', 'cv', 'curriculum vitae', 'resume builder', 'cv maker', 'template', 'ai resume', 'cover'] },
  { id: 'pdf-editor', category: 'pdf', groups: ['edit'], path: '/pdf/edit', icon: FilePen, popular: true, keywords: ['pdf editor', 'edit pdf', 'sign pdf', 'add text to pdf', 'annotate', 'whiteout', 'fill pdf', 'link'] },
  { id: 'images-to-pdf', category: 'pdf', groups: ['convert'], path: '/pdf/from-images', icon: FileText, keywords: ['jpg to pdf', 'png to pdf', 'image to pdf', 'photos to pdf', 'scan'] },
  { id: 'pdf-to-images', category: 'pdf', groups: ['convert'], path: '/pdf/to-images', icon: Images, keywords: ['pdf to jpg', 'pdf to png', 'pdf to image', 'extract pages'] },
  { id: 'pdf-merge', category: 'pdf', groups: ['edit'], path: '/pdf/merge', icon: FileStack, keywords: ['merge pdf', 'combine pdf', 'join pdf'] },
  { id: 'pdf-split', category: 'pdf', groups: ['edit'], path: '/pdf/split', icon: Scissors, keywords: ['split pdf', 'extract pages', 'separate pdf'] },
  { id: 'pdf-organize', category: 'pdf', groups: ['edit'], path: '/pdf/organize', icon: LayoutGrid, keywords: ['organize pdf', 'reorder pages', 'rotate pdf', 'delete pages'] },
  { id: 'pdf-compress', category: 'pdf', groups: ['compress'], path: '/pdf/compress', icon: FileDown, keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf'] },
]

export const TOOL_CATEGORIES = [
  { id: 'image', path: '/image-tools', icon: ImageIcon },
  { id: 'video', path: '/video-tools', icon: Clapperboard },
  { id: 'ai', path: '/ai-tools', icon: Sparkles },
  { id: 'pdf', path: '/pdf-tools', icon: FileText },
]

export const TOOL_GROUPS = ['compress', 'convert', 'edit', 'generate']

export function getCategoryPath(category) {
  return TOOL_CATEGORIES.find((item) => item.id === category)?.path ?? '/tools'
}

const TOOLS_BY_ID = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool]))

export function getTool(id) {
  return TOOLS_BY_ID[id]
}

export function getToolsByCategory(category) {
  return TOOLS.filter((tool) => tool.category === category)
}

export function getPopularTools() {
  const order = ['image-compress', 'image-convert', 'image-resize', 'image-crop', 'image-remove-bg', 'video-compress', 'video-trim', 'pdf-editor']
  return order.map(getTool)
}

/** Tools suggested after a user drops a file on the home page. */
export function getSuggestedToolsForKind(kind) {
  if (kind === 'heic') return ['heic-to-jpg'].map(getTool)
  const ids =
    kind === 'video'
      ? ['video-compress', 'video-convert', 'video-trim', 'video-crop', 'video-resize', 'video-to-gif', 'video-extract-audio', 'video-fit', 'video-text', 'video-thumbnail']
      : ['image-compress', 'image-convert', 'image-resize', 'image-crop', 'image-remove-bg', 'image-editor', 'image-filters', 'image-text', 'png-to-svg']
  return ids.map(getTool)
}


/**
 * Hover accent per tool. Hues are spread across the registry so neighbouring
 * cards differ; mid-tone values keep contrast in both light and dark themes.
 */
const ACCENTS = ['#0D9488', '#2563EB', '#7C3AED', '#E11D48', '#D97706', '#059669', '#0284C7', '#C026D3', '#EA580C', '#4F46E5', '#65A30D', '#0891B2', '#DB2777', '#DC2626']
const ACCENT_BY_ID = Object.fromEntries(TOOLS.map((tool, index) => [tool.id, ACCENTS[(index * 5) % ACCENTS.length]]))

export function getToolAccent(id) {
  return ACCENT_BY_ID[id] ?? ACCENTS[0]
}
