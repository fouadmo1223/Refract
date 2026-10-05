import { chatComplete, parseJsonReply } from '@/services/ai/textAi'
import { SECTION_TYPES, createItem, uid } from './resumeModel'

const LANGUAGE_NAMES = { en: 'English', ar: 'Arabic' }

const SCHEMA = `{
  "personal": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "", "summary": "" },
  "sections": [
    { "type": "experience|education|projects|skills|languages|certifications|awards|volunteering|interests|custom", "title": "", "items": [ { ...fields } ] }
  ]
}
Item fields by section type:
${Object.entries(SECTION_TYPES)
  .map(([type, info]) => `- ${type}: ${info.fields.join(', ')}`)
  .join('\n')}
For skills, "level" is a number 1-5. For languages, "level" is text such as "Native" or "Fluent".
"description" holds achievement bullets separated by "\\n" (no bullet characters).`

/** Normalise an AI reply into the editor's resume shape (ids, known fields only). */
function normalise(raw) {
  const personal = raw?.personal ?? {}
  const sections = (Array.isArray(raw?.sections) ? raw.sections : [])
    .filter((section) => SECTION_TYPES[section?.type])
    .map((section) => ({
      id: uid('s'),
      type: section.type,
      title: String(section.title || section.type),
      visible: true,
      items: (Array.isArray(section.items) ? section.items : []).map((item) => {
        const base = createItem(section.type)
        for (const field of SECTION_TYPES[section.type].fields) {
          const value = item?.[field]
          if (field === 'level' && section.type === 'skills') base.level = Math.max(1, Math.min(5, Number(value) || 4))
          else if (Array.isArray(value)) base[field] = value.join('\n')
          else if (value != null) base[field] = String(value)
        }
        return base
      }),
    }))
  return {
    personal: {
      fullName: String(personal.fullName ?? ''),
      title: String(personal.title ?? ''),
      email: String(personal.email ?? ''),
      phone: String(personal.phone ?? ''),
      location: String(personal.location ?? ''),
      website: String(personal.website ?? ''),
      linkedin: String(personal.linkedin ?? ''),
      github: String(personal.github ?? ''),
      summary: String(personal.summary ?? ''),
      photo: null,
    },
    sections,
  }
}

/**
 * Write a complete resume from a free-form description (or an old CV pasted in).
 * Facts come only from the user's text; missing contact details stay empty.
 */
export async function generateResume({ apiKey, model, description, targetRole, language, signal }) {
  const reply = await chatComplete({
    apiKey,
    model,
    json: true,
    signal,
    messages: [
      {
        role: 'system',
        content: `You are an expert resume writer. Return ONLY a JSON object with this shape:\n${SCHEMA}\nRules: write in ${LANGUAGE_NAMES[language] ?? 'English'}. Use only facts the user gives — never invent employers, schools, dates, numbers or contact details (leave unknown fields as ""). Turn duties into concise, results-focused bullets with strong verbs. Order sections by relevance. Section titles must be in the output language.`,
      },
      { role: 'user', content: `${targetRole ? `Target role: ${targetRole}\n\n` : ''}About me:\n${description}` },
    ],
  })
  return normalise(parseJsonReply(reply))
}

const IMPROVE_INSTRUCTIONS = {
  summary: 'Rewrite this professional summary to be confident, specific and 2–4 sentences long.',
  bullets: 'Rewrite these achievement bullets: start each with a strong action verb, keep them concise, keep every fact and number. One bullet per line, no bullet characters.',
  shorter: 'Make this text about 40% shorter while keeping the key facts.',
  grammar: 'Fix spelling and grammar only. Keep the wording and line breaks otherwise.',
}

/** Improve one piece of text (summary, bullets…). Returns plain text. */
export async function improveText({ apiKey, model, text, mode, role, language, signal }) {
  const reply = await chatComplete({
    apiKey,
    model,
    signal,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `You edit resume text. ${IMPROVE_INSTRUCTIONS[mode] ?? IMPROVE_INSTRUCTIONS.bullets} Write in ${LANGUAGE_NAMES[language] ?? 'the same language as the input'}. Never invent facts. Reply with the rewritten text only — no quotes, no explanations.`,
      },
      { role: 'user', content: `${role ? `Context: ${role}\n\n` : ''}${text}` },
    ],
  })
  return reply.replace(/^["'\s]+|["'\s]+$/g, '').replace(/^[-•*]\s*/gm, '')
}

/** Tailor summary + skills to a pasted job description. Returns { summary, skills: string[] }. */
export async function tailorToJob({ apiKey, model, resume, jobDescription, language, signal }) {
  const reply = await chatComplete({
    apiKey,
    model,
    json: true,
    signal,
    messages: [
      {
        role: 'system',
        content: `You tailor resumes to job ads. Return ONLY JSON: {"summary": "", "skills": [""]}. The summary (2–4 sentences) and up to 12 skills must be truthful to the resume — reword and reorder, highlight matching experience and keywords from the job ad, never invent experience. Write in ${LANGUAGE_NAMES[language] ?? 'English'}.`,
      },
      { role: 'user', content: `Job ad:\n${jobDescription}\n\nResume:\n${JSON.stringify({ ...resume, personal: { ...resume.personal, photo: null } })}` },
    ],
  })
  const parsed = parseJsonReply(reply)
  return { summary: String(parsed.summary ?? ''), skills: (Array.isArray(parsed.skills) ? parsed.skills : []).map(String).filter(Boolean).slice(0, 12) }
}
