import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Download, Ellipsis, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getTool } from '@/constants/tools'
import { copyToClipboard, downloadBlob } from '@/lib/download'
import { formatBytes } from '@/lib/format'
import { notify } from '@/lib/notify'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { openInTool, toGeneratedFile } from './aiHandoff'

/**
 * One generated image or video with download, copy-prompt and
 * "continue in another tool" actions.
 */
export const GeneratedCard = memo(function GeneratedCard({ item, followUpTools, onRemove }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const url = useObjectUrl(item.blob)
  const isVideo = item.blob.type.startsWith('video/')
  const baseName = `ai-${item.seed ?? item.id.slice(0, 6)}`

  return (
    <motion.figure
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="checkerboard flex items-center justify-center" style={{ aspectRatio: item.width && item.height ? `${item.width} / ${item.height}` : '16 / 9' }}>
        {url && (isVideo ? <video src={url} controls playsInline loop className="size-full bg-black object-contain" /> : <img src={url} alt={item.prompt} className="size-full object-contain" />)}
      </div>
      <figcaption className="flex items-start gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs text-text-2" dir="auto" title={item.prompt}>
            {item.prompt}
          </p>
          <p className="tabular mt-1 truncate text-2xs text-muted">
            {[item.model?.split('/').pop(), item.seed != null ? `seed ${item.seed}` : null, formatBytes(item.blob.size)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <IconButton icon={Download} label={t('common.download')} size="sm" onClick={() => downloadBlob(item.blob, toGeneratedFile(item.blob, baseName).name)} />
        <Dropdown
          label={t('ai.moreActions')}
          trigger={<IconButton icon={Ellipsis} label={t('ai.moreActions')} size="sm" />}
          items={[
            ...followUpTools.map((toolId) => ({
              id: toolId,
              label: t('ai.openIn', { tool: t(`tools.${toolId}.title`) }),
              icon: getTool(toolId).icon,
              onSelect: () => openInTool(navigate, toolId, toGeneratedFile(item.blob, baseName)),
            })),
            {
              id: 'copy-prompt',
              label: t('ai.copyPrompt'),
              icon: Copy,
              separatorBefore: true,
              onSelect: () => copyToClipboard(item.prompt).then(() => notify.success('toasts.copied')),
            },
            { id: 'remove', label: t('common.remove'), icon: Trash2, danger: true, onSelect: () => onRemove(item.id) },
          ]}
        />
      </figcaption>
    </motion.figure>
  )
})
