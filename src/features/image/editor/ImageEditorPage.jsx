import { useState } from 'react'
import { Check, Eye, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { useHistoryState } from '@/hooks/useHistoryState'
import { useHotkey } from '@/hooks/useHotkey'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { exportEditedImage } from '@/services/image/imageEditorService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { IconButton } from '@/components/ui/IconButton'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { fitAspectRect } from '@/components/media/cropGeometry'
import { ImageResult } from '../shared/ImageResult'
import { EditorPreview, useCompareToggle } from './EditorPreview'
import { EditorSettings } from './EditorPanels'
import { INITIAL_EDITOR_STATE, isPristine } from './editorState'

const TOOL_ID = 'image-editor'

function EditorToolbar({ history, showOriginalBind, disabled }) {
  const { t } = useTranslation()
  return (
    <div className="mb-2 flex items-center gap-1">
      <IconButton icon={Undo2} label={t('editor.undo')} size="sm" variant="secondary" onClick={history.undo} disabled={disabled || !history.canUndo} />
      <IconButton icon={Redo2} label={t('editor.redo')} size="sm" variant="secondary" onClick={history.redo} disabled={disabled || !history.canRedo} />
      <IconButton icon={RotateCcw} label={t('editor.resetAll')} size="sm" variant="secondary" onClick={() => history.commit(INITIAL_EDITOR_STATE)} disabled={disabled || isPristine(history.value)} />
      <span className="flex-1" />
      <IconButton icon={Eye} label={t('editor.holdToCompare')} size="sm" variant="secondary" disabled={disabled} {...showOriginalBind} />
    </div>
  )
}

export default function ImageEditorPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const history = useHistoryState(INITIAL_EDITOR_STATE)
  const [cropMode, setCropMode] = useState(false)
  const [draftCrop, setDraftCrop] = useState(null)
  const [showOriginal, showOriginalBind] = useCompareToggle()
  const { bitmap } = usePreviewBitmap(file, 1400)
  const state = history.value

  useHotkey('mod+z', history.undo, { enabled: Boolean(file) })
  useHotkey('mod+shift+z', history.redo, { enabled: Boolean(file) })
  useHotkey('mod+y', history.redo, { enabled: Boolean(file) })

  const handleFileChange = (next) => {
    setFile(next)
    history.reset(INITIAL_EDITOR_STATE)
    setCropMode(false)
  }

  const startCrop = (meta) => {
    const swapped = state.transform.rotation % 180 !== 0
    const width = swapped ? meta.height : meta.width
    const height = swapped ? meta.width : meta.height
    setDraftCrop(state.crop ?? fitAspectRect(width, height, null, 0.9))
    setCropMode(true)
  }
  const applyCrop = () => {
    history.commit({ ...state, crop: draftCrop, resize: null })
    setCropMode(false)
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={handleFileChange}
        actionLabel={t('tools.image-editor.action')}
        actionIcon={Check}
        processingTitle={t('processing.exportingImage')}
        successMessage="toasts.imageExported"
        canProcess={!cropMode}
        renderPreview={({ meta }) => (
          <div>
            <EditorToolbar history={history} showOriginalBind={showOriginalBind} disabled={cropMode} />
            <EditorPreview bitmap={bitmap} meta={meta} state={state} cropMode={cropMode} draftCrop={draftCrop} onDraftCropChange={setDraftCrop} showOriginal={showOriginal} />
          </div>
        )}
        renderSettings={({ meta }) => (
          <EditorSettings
            meta={meta}
            state={state}
            onLiveChange={history.set}
            onCommit={history.commit}
            cropMode={cropMode}
            onCropStart={() => startCrop(meta)}
            onCropApply={applyCrop}
            onCropCancel={() => setCropMode(false)}
          />
        )}
        onProcess={({ file: source, signal, onProgress }) =>
          exportEditedImage(source, { transform: state.transform, crop: state.crop, adjustments: state.adjustments, resize: state.resize }, { signal, onProgress })
        }
        renderResult={(context) => <ImageResult {...context} title={t('result.editComplete')} suffix="edited" compare={!state.crop && state.transform.rotation === 0 && !state.resize} />}
      />
    </ToolLayout>
  )
}
