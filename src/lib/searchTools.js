import { TOOLS } from '@/constants/tools'

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ]/g, '') // Arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
}

/**
 * Search tools by localized title, English title and keywords in both
 * languages, so "compress", "ضغط" or "webp" all work regardless of UI language.
 * Every query token must match; titles weigh more than keywords.
 *
 * @param {string} query
 * @param {(key: string, options?: object) => string} t active translator
 * @param {(key: string) => string} tEn English translator
 */
export function searchTools(query, t, tEn) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  const available = TOOLS.filter((tool) => tool.status !== 'soon')
  if (!tokens.length) return []

  const scored = available.map((tool) => {
    const title = normalize(t(`tools.${tool.id}.title`))
    const englishTitle = normalize(tEn(`tools.${tool.id}.title`))
    const keywords = normalize(`${tool.keywords.join(' ')} ${t(`tools.${tool.id}.keywords`, { defaultValue: '' })} ${tool.category} ${tool.groups.join(' ')}`)
    let score = 0
    for (const token of tokens) {
      let tokenScore = 0
      if (title.startsWith(token) || englishTitle.startsWith(token)) tokenScore = 100
      else if (title.split(' ').some((word) => word.startsWith(token)) || englishTitle.split(' ').some((word) => word.startsWith(token))) tokenScore = 70
      else if (title.includes(token) || englishTitle.includes(token)) tokenScore = 50
      else if (keywords.split(' ').some((word) => word.startsWith(token))) tokenScore = 30
      else if (keywords.includes(token)) tokenScore = 15
      if (!tokenScore) return { tool, score: 0 }
      score += tokenScore
    }
    return { tool, score: score + (tool.popular ? 5 : 0) }
  })

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.tool)
}
