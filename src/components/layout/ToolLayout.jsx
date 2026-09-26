import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToolPrefsStore } from '@/store/toolPrefsStore'
import { getCategoryPath, getTool } from '@/constants/tools'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/misc'
import { Cloud, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Stagger, StaggerItem } from '@/components/ui/Stagger'

/**
 * Shared page frame for every tool: SEO meta, breadcrumb, title, description.
 */
export function ToolLayout({ toolId, children }) {
  const { t } = useTranslation()
  const tool = getTool(toolId)
  const title = t(`tools.${toolId}.title`)
  const setLastUsed = useToolPrefsStore((state) => state.setLastUsed)

  // Opening a tool makes it the "last used" one, pinned first in every grid.
  useEffect(() => setLastUsed(toolId), [setLastUsed, toolId])

  useDocumentMeta({
    title: `${t(`tools.${toolId}.seoTitle`)} | ${t('app.name')}`,
    description: t(`tools.${toolId}.seoDescription`),
    path: tool.path,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <Stagger stagger={0.06}>
      <StaggerItem>
      <Breadcrumb
        items={[
          { label: t(`categories.${tool.category}.title`), to: getCategoryPath(tool.category) },
          { label: title },
        ]}
      />
      </StaggerItem>
      <StaggerItem as="header" className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{t(`tools.${toolId}.description`)}</p>
        </div>
        {tool.processing === 'server' ? (
          <Badge tone="warning" icon={Cloud} className="self-start sm:self-auto">
            {t('privacy.cloudBadge')}
          </Badge>
        ) : (
          <Badge tone="success" icon={ShieldCheck} className="self-start sm:self-auto">
            {t('privacy.badge')}
          </Badge>
        )}
      </StaggerItem>
      </Stagger>
      <motion.div className="mt-6 sm:mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.div>
    </div>
  )
}
