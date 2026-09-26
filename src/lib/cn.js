import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs'] }],
      shadow: [{ shadow: ['xs', 'sm', 'md', 'lg'] }],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
