import { Link } from 'react-router-dom'
import { Compass, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/feedback/States'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const openCommandPalette = useUiStore((state) => state.openCommandPalette)
  useDocumentMeta({ title: `${t('pages.notFound.title')} | ${t('app.name')}` })
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState
        icon={Compass}
        title={t('pages.notFound.title')}
        description={t('pages.notFound.description')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button as={Link} to="/" variant="primary">
              {t('nav.home')}
            </Button>
            <Button variant="secondary" leftIcon={Search} onClick={openCommandPalette}>
              {t('search.title')}
            </Button>
          </div>
        }
      />
    </div>
  )
}
