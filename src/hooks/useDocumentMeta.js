import { useEffect } from 'react'
import { BASE_PATH } from '@/lib/basePath'

function upsertMeta(selector, create) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = create()
    document.head.appendChild(element)
  }
  return element
}

/** Sets title, description and canonical link for the current route. */
export function useDocumentMeta({ title, description, path }) {
  useEffect(() => {
    if (title) document.title = title
    if (description) {
      const meta = upsertMeta('meta[name="description"]', () => {
        const element = document.createElement('meta')
        element.name = 'description'
        return element
      })
      meta.content = description
    }
    if (path != null) {
      const link = upsertMeta('link[rel="canonical"]', () => {
        const element = document.createElement('link')
        element.rel = 'canonical'
        return element
      })
      link.href = `${window.location.origin}${BASE_PATH}${path}`
    }
  }, [title, description, path])
}
