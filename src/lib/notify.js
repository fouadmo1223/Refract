import { toast } from 'sonner'
import i18n from '@/i18n'
import { getErrorMessage, isCanceled } from './errors'

/**
 * Thin, translated toast API. Components pass translation keys, never raw strings,
 * so toasts follow the active language and direction.
 */
export const notify = {
  success: (key, options) => toast.success(i18n.t(key, options?.values), options),
  info: (key, options) => toast.info(i18n.t(key, options?.values), options),
  warning: (key, options) => toast.warning(i18n.t(key, options?.values), options),
  loading: (key, options) => toast.loading(i18n.t(key, options?.values), options),
  dismiss: (id) => toast.dismiss(id),
  error: (error, fallbackCode) => {
    if (isCanceled(error)) return undefined
    const message = getErrorMessage(i18n.t, error, fallbackCode)
    return toast.error(message.title, { description: message.description })
  },
}
