let counter = 0
export const uid = (prefix = 'r') => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`

/** Section types and the fields each item has (drives the editor form and templates). */
export const SECTION_TYPES = {
  experience: { fields: ['role', 'company', 'location', 'start', 'end', 'description'], dated: true },
  education: { fields: ['degree', 'school', 'location', 'start', 'end', 'description'], dated: true },
  projects: { fields: ['name', 'link', 'start', 'end', 'description'], dated: true },
  skills: { fields: ['name', 'level'], compact: true },
  languages: { fields: ['name', 'level'], compact: true },
  certifications: { fields: ['name', 'issuer', 'date', 'link'] },
  awards: { fields: ['name', 'issuer', 'date', 'description'] },
  volunteering: { fields: ['role', 'company', 'start', 'end', 'description'], dated: true },
  references: { fields: ['name', 'role', 'company', 'email', 'phone'] },
  interests: { fields: ['name'], compact: true },
  custom: { fields: ['title', 'subtitle', 'start', 'end', 'description'], dated: true },
}

/** Sections that sidebar-style templates put in the narrow column. */
export const SIDE_SECTIONS = ['skills', 'languages', 'interests', 'certifications', 'references']

export const TEMPLATES = ['modern', 'sidebar', 'classic', 'minimal', 'executive', 'compact']

export const FONT_PAIRS = {
  inter: { heading: '"Inter Variable", "Inter", "IBM Plex Sans Arabic", sans-serif', body: '"Inter Variable", "Inter", "IBM Plex Sans Arabic", sans-serif' },
  roboto: { heading: '"Roboto", "IBM Plex Sans Arabic", sans-serif', body: '"Roboto", "IBM Plex Sans Arabic", sans-serif' },
  poppins: { heading: '"Poppins", "IBM Plex Sans Arabic", sans-serif', body: '"Source Sans 3", "IBM Plex Sans Arabic", sans-serif' },
  lora: { heading: '"Lora", "IBM Plex Sans Arabic", serif', body: '"Source Sans 3", "IBM Plex Sans Arabic", sans-serif' },
  playfair: { heading: '"Playfair Display", "IBM Plex Sans Arabic", serif', body: '"Lora", "IBM Plex Sans Arabic", serif' },
  merriweather: { heading: '"Merriweather", "IBM Plex Sans Arabic", serif', body: '"Merriweather", "IBM Plex Sans Arabic", serif' },
  arabic: { heading: '"IBM Plex Sans Arabic", "Inter Variable", sans-serif', body: '"IBM Plex Sans Arabic", "Inter Variable", sans-serif' },
}

export const ACCENTS = ['#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0F172A', '#475569']

export const PAPER = { a4: { width: 794, height: 1123 }, letter: { width: 816, height: 1056 } }

export const DEFAULT_DESIGN = {
  template: 'modern',
  accent: '#0D9488',
  font: 'inter',
  fontSize: 10,
  lineHeight: 1.45,
  spacing: 'normal',
  margin: 40,
  paper: 'a4',
  photo: true,
  photoShape: 'circle',
  headingStyle: 'accent',
  uppercaseHeadings: true,
  showIcons: true,
  skillStyle: 'bars',
  direction: 'auto',
}

export function createItem(type) {
  const item = { id: uid('i') }
  for (const field of SECTION_TYPES[type].fields) item[field] = field === 'level' ? (type === 'skills' ? 4 : '') : ''
  return item
}

export function createSection(type, title) {
  return { id: uid('s'), type, title, visible: true, items: [createItem(type)] }
}

const lines = (...rows) => rows.join('\n')

/** Example content so every template looks finished before the user types. */
export function sampleResume(lang = 'en') {
  if (lang === 'ar') {
    return {
      personal: {
        fullName: 'سارة أحمد',
        title: 'مهندسة برمجيات أولى',
        email: 'sara@example.com',
        phone: '+20 100 000 0000',
        location: 'القاهرة، مصر',
        website: 'sara.dev',
        linkedin: 'linkedin.com/in/sara',
        github: 'github.com/sara',
        photo: null,
        summary: 'مهندسة برمجيات بخبرة 7 سنوات في بناء تطبيقات ويب سريعة وسهلة الاستخدام. أقود فرقًا صغيرة وأحب تحويل الأفكار المعقدة إلى منتجات بسيطة.',
      },
      sections: [
        {
          id: uid('s'),
          type: 'experience',
          title: 'الخبرة العملية',
          visible: true,
          items: [
            { id: uid('i'), role: 'مهندسة برمجيات أولى', company: 'شركة تقنية', location: 'القاهرة', start: '2021', end: 'الآن', description: lines('قيادة فريق من 5 مطورين لإعادة بناء لوحة التحكم الرئيسية', 'تحسين سرعة التحميل بنسبة 45% وتقليل تكاليف الخوادم') },
            { id: uid('i'), role: 'مطورة واجهات أمامية', company: 'استوديو رقمي', location: 'الإسكندرية', start: '2018', end: '2021', description: lines('تطوير أكثر من 20 موقعًا لعملاء في الشرق الأوسط', 'بناء مكتبة مكونات مشتركة باستخدام React') },
          ],
        },
        { id: uid('s'), type: 'education', title: 'التعليم', visible: true, items: [{ id: uid('i'), degree: 'بكالوريوس علوم الحاسب', school: 'جامعة القاهرة', location: 'القاهرة', start: '2014', end: '2018', description: '' }] },
        { id: uid('s'), type: 'skills', title: 'المهارات', visible: true, items: ['React', 'TypeScript', 'Node.js', 'تصميم الواجهات', 'قيادة الفرق'].map((name, index) => ({ id: uid('i'), name, level: 5 - (index % 2) })) },
        { id: uid('s'), type: 'languages', title: 'اللغات', visible: true, items: [{ id: uid('i'), name: 'العربية', level: 'اللغة الأم' }, { id: uid('i'), name: 'الإنجليزية', level: 'طلاقة' }] },
      ],
    }
  }
  return {
    personal: {
      fullName: 'Alex Morgan',
      title: 'Senior Product Designer',
      email: 'alex@example.com',
      phone: '+1 555 010 2030',
      location: 'Berlin, Germany',
      website: 'alexmorgan.design',
      linkedin: 'linkedin.com/in/alexmorgan',
      github: 'github.com/alexmorgan',
      photo: null,
      summary: 'Product designer with 8 years of experience shipping web and mobile products used by millions. I turn messy problems into clear, accessible interfaces and love working closely with engineers.',
    },
    sections: [
      {
        id: uid('s'),
        type: 'experience',
        title: 'Experience',
        visible: true,
        items: [
          { id: uid('i'), role: 'Senior Product Designer', company: 'Northwind', location: 'Berlin', start: '2021', end: 'Present', description: lines('Led the redesign of the checkout flow, lifting conversion by 18%', 'Built and maintained a design system used by 6 product teams', 'Mentored 4 designers through weekly critiques') },
          { id: uid('i'), role: 'Product Designer', company: 'Brightlane', location: 'Amsterdam', start: '2018', end: '2021', description: lines('Designed the onboarding experience for a fintech app with 2M users', 'Ran 30+ usability studies and turned findings into roadmap items') },
        ],
      },
      { id: uid('s'), type: 'education', title: 'Education', visible: true, items: [{ id: uid('i'), degree: 'BA in Interaction Design', school: 'University of the Arts', location: 'London', start: '2013', end: '2017', description: '' }] },
      { id: uid('s'), type: 'projects', title: 'Projects', visible: true, items: [{ id: uid('i'), name: 'Open Icons', link: 'github.com/alexmorgan/open-icons', start: '2022', end: '', description: 'An open-source icon set with 1,200 icons and 3k GitHub stars.' }] },
      { id: uid('s'), type: 'skills', title: 'Skills', visible: true, items: ['Product design', 'Figma', 'Prototyping', 'Design systems', 'User research', 'HTML & CSS'].map((name, index) => ({ id: uid('i'), name, level: 5 - (index % 3) })) },
      { id: uid('s'), type: 'languages', title: 'Languages', visible: true, items: [{ id: uid('i'), name: 'English', level: 'Native' }, { id: uid('i'), name: 'German', level: 'Professional' }] },
    ],
  }
}

export function emptyResume() {
  return {
    personal: { fullName: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: null, summary: '' },
    sections: [createSection('experience', 'Experience'), createSection('education', 'Education'), createSection('skills', 'Skills')],
  }
}

/** Turn "linkedin.com/in/x" or an email/phone into a clickable href. */
export function hrefFor(kind, value) {
  if (!value) return null
  if (kind === 'email') return `mailto:${value}`
  if (kind === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export const hasArabic = (resume) => /[؀-ۿ]/.test(JSON.stringify({ ...resume, personal: { ...resume.personal, photo: null } }))
