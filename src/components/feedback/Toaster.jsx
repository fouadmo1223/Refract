import { Toaster as SonnerToaster } from 'sonner'
import { CircleAlert, CircleCheckBig, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useResolvedTheme } from '@/hooks/useTheme'

/**
 * App toaster — sonner in unstyled mode with our tokens. Position and text
 * direction follow the active language so Arabic toasts sit on the left, RTL.
 */
export function Toaster() {
  const { i18n } = useTranslation()
  const theme = useResolvedTheme()
  const isRtl = i18n.dir() === 'rtl'

  return (
    <SonnerToaster
      dir={isRtl ? 'rtl' : 'ltr'}
      position={isRtl ? 'bottom-left' : 'bottom-right'}
      theme={theme}
      gap={8}
      visibleToasts={4}
      offset={16}
      mobileOffset={12}
      icons={{
        success: <CircleCheckBig size={17} className="text-success" />,
        error: <CircleAlert size={17} className="text-danger" />,
        warning: <TriangleAlert size={17} className="text-warning" />,
        info: <Info size={17} className="text-primary" />,
        loading: <LoaderCircle size={17} className="animate-spin text-muted" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 text-text shadow-lg sm:w-[356px] font-[inherit]',
          icon: 'mt-px flex shrink-0 items-center',
          content: 'flex min-w-0 flex-1 flex-col gap-0.5',
          title: 'text-[13px] font-semibold leading-5',
          description: 'text-xs leading-relaxed text-muted',
          actionButton: 'shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg',
          cancelButton: 'shrink-0 rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-text',
          closeButton: 'text-muted',
        },
      }}
    />
  )
}
