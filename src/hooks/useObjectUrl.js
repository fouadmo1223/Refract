import { useEffect, useState } from 'react'

/**
 * Creates an object URL for a Blob and revokes it when the blob changes or
 * the component unmounts. Always prefer this over calling createObjectURL in render.
 */
export function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return undefined
    }
    const nextUrl = URL.createObjectURL(blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])

  return url
}
