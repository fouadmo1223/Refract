import { useMemo, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TOOLS, TOOL_GROUPS } from '@/constants/tools'
import { searchTools } from '@/lib/searchTools'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/feedback/States'
import { SortableToolGrid } from '@/components/media/SortableToolGrid'
import i18n from '@/i18n'

const tEn = i18n.getFixedT('en')
const PATHS = { image: '/image-tools', video: '/video-tools', ai: '/ai-tools', all: '/tools' }

/** Listing for /image-tools, /video-tools and /tools with group filter + inline search. */
export default function CategoryPage({ category }) {
  const { t } = useTranslation()
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')

  useDocumentMeta({
    title: `${t(`categories.${category}.seoTitle`)} | ${t('app.name')}`,
    description: t(`categories.${category}.description`),
    path: PATHS[category],
  })

  const baseTools = useMemo(() => (category === 'all' ? TOOLS : TOOLS.filter((tool) => tool.category === category)), [category])
  const groupTabs = useMemo(() => {
    const tabs = [{ value: 'all', label: t('groups.all'), count: baseTools.length }]
    if (category === 'all') {
      tabs.push(
        { value: 'image', label: t('categories.image.short'), count: baseTools.filter((tool) => tool.category === 'image').length },
        { value: 'video', label: t('categories.video.short'), count: baseTools.filter((tool) => tool.category === 'video').length },
        { value: 'ai', label: t('categories.ai.short'), count: baseTools.filter((tool) => tool.category === 'ai').length },
      )
    }
    for (const id of TOOL_GROUPS.filter((groupId) => baseTools.some((tool) => tool.groups.includes(groupId)))) tabs.push({ value: id, label: t(`groups.${id}`), count: baseTools.filter((tool) => tool.groups.includes(id)).length })
    return tabs
  }, [baseTools, category, t])

  const visibleTools = useMemo(() => {
    let list = baseTools
    if (['image', 'video', 'ai'].includes(group)) list = list.filter((tool) => tool.category === group)
    else if (group !== 'all') list = list.filter((tool) => tool.groups.includes(group))
    if (query.trim()) {
      const matches = searchTools(query, t, tEn)
      list = matches.filter((tool) => list.includes(tool))
    }
    return list
  }, [baseTools, group, query, t])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <Breadcrumb items={[{ label: t('nav.home'), to: '/' }, { label: t(`categories.${category}.title`) }]} />
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{t(`categories.${category}.title`)}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{t(`categories.${category}.description`)}</p>
        </div>
        <Input
          aria-label={t('search.filterTools')}
          placeholder={t('search.filterTools')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<Search size={15} aria-hidden="true" />}
          className="w-full sm:w-64"
          type="search"
        />
      </div>
      <Tabs tabs={groupTabs} value={group} onChange={setGroup} aria-label={t('groups.label')} className="mt-6" />
      {visibleTools.length ? (
        <div className="mt-5">
          <SortableToolGrid
            key={group}
            listKey={query.trim() ? 'search' : `category:${category}`}
            tools={visibleTools}
            sortable={group === 'all' && !query.trim()}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          />
        </div>
      ) : (
        <EmptyState icon={SearchX} title={t('search.noResultsTitle')} description={t('search.noResults', { query })} />
      )}
    </div>
  )
}
