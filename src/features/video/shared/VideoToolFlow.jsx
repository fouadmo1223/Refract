import { useCallback } from 'react'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { preloadFFmpeg } from '@/services/video/ffmpeg/ffmpegClient'
import { readVideoMetadata } from '@/services/video/videoMetadataService'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'

/**
 * MediaToolFlow preconfigured for video: video upload profile, metadata
 * probing, long-running processing UI, and FFmpeg warm-up as soon as the
 * user picks a file (not before — the engine is ~30 MB).
 */
export function VideoToolFlow({ onFileChange, profile = UPLOAD_PROFILES.video, loadMeta = readVideoMetadata, ...props }) {
  const handleFileChange = useCallback(
    (file) => {
      if (file) preloadFFmpeg()
      onFileChange?.(file)
    },
    [onFileChange],
  )
  return <MediaToolFlow profile={profile} loadMeta={loadMeta} longRunning onFileChange={handleFileChange} {...props} />
}
