import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

/** Simple prose page used by /about and /privacy. Content comes from locale files. */
export function ProsePage({ pageKey, path }) {
  const { t } = useTranslation()
  const sections = t(`pages.${pageKey}.sections`, { returnObjects: true })
  useDocumentMeta({ title: `${t(`pages.${pageKey}.title`)} | ${t('app.name')}`, description: t(`pages.${pageKey}.intro`), path })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Breadcrumb items={[{ label: t('nav.home'), to: '/' }, { label: t(`pages.${pageKey}.title`) }]} />
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{t(`pages.${pageKey}.title`)}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-2">{t(`pages.${pageKey}.intro`)}</p>
      <div className="mt-8 flex flex-col gap-7">
        {Array.isArray(sections) &&
          sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-text">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
      </div>
    </div>
  )
}
