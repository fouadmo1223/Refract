import { getTool } from '@/constants/tools'
import { usePendingFileStore } from '@/store/pendingFileStore'

/** Wrap a generated blob in a File with a readable name. */
export function toGeneratedFile(blob, baseName) {
  const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1]?.replace('quicktime', 'mov') || 'bin'
  return new File([blob], `${baseName}.${ext}`, { type: blob.type, lastModified: Date.now() })
}

/** Send a generated file into another tool (edit, remove background, animate…). */
export function openInTool(navigate, toolId, file) {
  usePendingFileStore.getState().setPendingFile(file)
  navigate(getTool(toolId).path)
}

export const IMAGE_FOLLOW_UP_TOOLS = ['ai-video', 'image-editor', 'image-remove-bg', 'image-resize', 'image-compress', 'image-convert']
export const VIDEO_FOLLOW_UP_TOOLS = ['video-trim', 'video-compress', 'video-convert', 'video-to-gif', 'video-add-audio']
