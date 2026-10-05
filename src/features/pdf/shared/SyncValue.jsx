import { useEffect } from 'react'

/** Pushes a value derived during render (e.g. loaded metadata) up into parent state. */
export function SyncValue({ value, onChange }) {
  useEffect(() => {
    onChange(value)
  }, [onChange, value])
  return null
}
