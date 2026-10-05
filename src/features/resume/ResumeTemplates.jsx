import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { FONT_PAIRS, PAPER, SECTION_TYPES, SIDE_SECTIONS, hasArabic, hrefFor } from './resumeModel'

/* -------------------------------------------------------------- Brand glyphs */
const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
)
const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3" />
  </svg>
)

const CONTACT_FIELDS = [
  { key: 'email', icon: Mail },
  { key: 'phone', icon: Phone },
  { key: 'location', icon: MapPin, plain: true },
  { key: 'website', icon: Globe },
  { key: 'linkedin', icon: LinkedinIcon },
  { key: 'github', icon: GithubIcon },
]

/* -------------------------------------------------------------- Building blocks */
export function ContactList({ personal, design, vertical = false, color, separator = false }) {
  const entries = CONTACT_FIELDS.filter(({ key }) => personal[key])
  return (
    <ul style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', flexWrap: 'wrap', gap: vertical ? '0.45em' : '0.35em 1.1em', color, fontSize: '0.92em', listStyle: 'none', margin: 0, padding: 0 }}>
      {entries.map(({ key, icon: Icon, plain }, index) => {
        const href = plain ? null : hrefFor(key, personal[key])
        const content = (
          <>
            {design.showIcons && <Icon style={{ width: '1.05em', height: '1.05em', flexShrink: 0, color: color ?? 'var(--accent)' }} />}
            {/* Emails, phones and URLs stay left-to-right inside RTL resumes. */}
            <span dir={plain ? 'auto' : 'ltr'} style={{ overflowWrap: 'anywhere', unicodeBidi: 'isolate' }}>
              {personal[key]}
            </span>
          </>
        )
        return (
          <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
            {separator && index > 0 && !design.showIcons && <span style={{ opacity: 0.5, marginInlineEnd: '0.6em' }}>•</span>}
            {href ? (
              <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', color: 'inherit', textDecoration: 'none' }}>
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function SectionTitle({ children, design, color = 'var(--accent)', light = false }) {
  const style = {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.08em',
    fontWeight: 700,
    letterSpacing: design.uppercaseHeadings ? '0.08em' : '0.01em',
    textTransform: design.uppercaseHeadings ? 'uppercase' : 'none',
    color: light ? '#FFFFFF' : design.headingStyle === 'plain' ? 'var(--text)' : color,
    margin: '0 0 0.55em',
    breakAfter: 'avoid',
  }
  if (design.headingStyle === 'underline') return <h2 style={{ ...style, paddingBottom: '0.3em', borderBottom: `1.5px solid ${light ? 'rgba(255,255,255,0.5)' : color}` }}>{children}</h2>
  if (design.headingStyle === 'pill')
    return (
      <h2 style={{ ...style, display: 'inline-block', padding: '0.15em 0.7em', borderRadius: '999px', background: light ? 'rgba(255,255,255,0.18)' : 'var(--accent-soft)' }}>
        {children}
      </h2>
    )
  if (design.headingStyle === 'accent')
    return (
      <h2 style={{ ...style, display: 'flex', alignItems: 'center', gap: '0.5em' }}>
        <span style={{ width: '0.3em', height: '1em', borderRadius: '2px', background: light ? '#FFFFFF' : color, flexShrink: 0 }} />
        {children}
      </h2>
    )
  return <h2 style={style}>{children}</h2>
}

function Description({ text, light }) {
  if (!text?.trim()) return null
  const rows = text.split('\n').map((row) => row.trim()).filter(Boolean)
  if (rows.length === 1) return <p style={{ margin: '0.25em 0 0', color: light ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}>{rows[0]}</p>
  return (
    <ul style={{ margin: '0.3em 0 0', paddingInlineStart: '1.1em', color: light ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}>
      {rows.map((row, index) => (
        <li key={index} style={{ margin: '0.12em 0' }}>
          {row.replace(/^[-•*]\s*/, '')}
        </li>
      ))}
    </ul>
  )
}

const dateRange = (item) => [item.start, item.end].filter(Boolean).join(' – ') || item.date || ''

/** Title / subtitle / dates for any dated or titled item. */
function ItemHeader({ item, type, light, inlineDates = true }) {
  const title = item.role || item.degree || item.name || item.title
  const subtitle = [item.company || item.school || item.issuer || item.subtitle, item.location].filter(Boolean).join(' · ')
  const dates = dateRange(item)
  const link = type === 'projects' || type === 'certifications' ? item.link : null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1em', alignItems: 'baseline', flexWrap: inlineDates ? 'nowrap' : 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 650, color: light ? '#FFFFFF' : 'var(--text)' }}>
          {title}
          {link && (
            <a href={hrefFor('link', link)} style={{ marginInlineStart: '0.5em', fontWeight: 400, fontSize: '0.9em', color: light ? '#FFFFFF' : 'var(--accent)', textDecoration: 'none' }}>
              {link}
            </a>
          )}
        </p>
        {subtitle && <p style={{ margin: '0.08em 0 0', color: light ? 'rgba(255,255,255,0.8)' : 'var(--accent-text)', fontWeight: 500 }}>{subtitle}</p>}
      </div>
      {dates && <p style={{ margin: 0, flexShrink: 0, fontSize: '0.9em', color: light ? 'rgba(255,255,255,0.75)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{dates}</p>}
    </div>
  )
}

function SkillList({ items, design, light }) {
  const visible = items.filter((item) => item.name)
  if (design.skillStyle === 'tags') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35em' }}>
        {visible.map((item) => (
          <span key={item.id} style={{ padding: '0.18em 0.65em', borderRadius: '999px', fontSize: '0.92em', background: light ? 'rgba(255,255,255,0.16)' : 'var(--accent-soft)', color: light ? '#FFFFFF' : 'var(--accent-text)' }}>
            {item.name}
          </span>
        ))}
      </div>
    )
  }
  if (design.skillStyle === 'list') return <p style={{ margin: 0, color: light ? '#FFFFFF' : 'var(--text)' }}>{visible.map((item) => item.name).join(' · ')}</p>
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.45em' }}>
      {visible.map((item) => {
        const level = Math.max(0, Math.min(5, Number(item.level) || 0))
        return (
          <li key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: light ? '#FFFFFF' : 'var(--text)' }}>
              <span>{item.name}</span>
            </div>
            {design.skillStyle === 'dots' ? (
              <div style={{ display: 'flex', gap: '0.3em', marginTop: '0.2em' }}>
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span key={dot} style={{ width: '0.6em', height: '0.6em', borderRadius: '50%', background: dot <= level ? (light ? '#FFFFFF' : 'var(--accent)') : light ? 'rgba(255,255,255,0.25)' : 'var(--line)' }} />
                ))}
              </div>
            ) : (
              <div style={{ height: '0.35em', borderRadius: '99px', marginTop: '0.25em', background: light ? 'rgba(255,255,255,0.25)' : 'var(--line)' }}>
                <div style={{ width: `${(level / 5) * 100}%`, height: '100%', borderRadius: '99px', background: light ? '#FFFFFF' : 'var(--accent)' }} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function SimpleList({ items, light, withLevel }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.3em' }}>
      {items
        .filter((item) => item.name)
        .map((item) => (
          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1em', color: light ? '#FFFFFF' : 'var(--text)' }}>
            <span>{item.name}</span>
            {withLevel && item.level && <span style={{ color: light ? 'rgba(255,255,255,0.75)' : 'var(--muted)', fontSize: '0.92em' }}>{item.level}</span>}
          </li>
        ))}
    </ul>
  )
}

function ReferenceList({ items, light }) {
  return (
    <div style={{ display: 'grid', gap: '0.6em' }}>
      {items.map((item) => (
        <div key={item.id}>
          <p style={{ margin: 0, fontWeight: 650, color: light ? '#FFFFFF' : 'var(--text)' }}>{item.name}</p>
          <p style={{ margin: 0, color: light ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>{[item.role, item.company].filter(Boolean).join(', ')}</p>
          <p style={{ margin: 0, color: light ? 'rgba(255,255,255,0.8)' : 'var(--muted)', fontSize: '0.92em' }}>{[item.email, item.phone].filter(Boolean).join(' · ')}</p>
        </div>
      ))}
    </div>
  )
}

/** Any section, rendered with the right layout for its type. */
export function Section({ section, design, light = false, timeline = false }) {
  if (!section.visible || !section.items.length) return null
  const { type } = section
  let body
  if (type === 'skills') body = <SkillList items={section.items} design={design} light={light} />
  else if (type === 'languages') body = <SimpleList items={section.items} light={light} withLevel />
  else if (type === 'interests') body = <SimpleList items={section.items} light={light} />
  else if (type === 'references') body = <ReferenceList items={section.items} light={light} />
  else {
    body = (
      <div style={{ display: 'grid', gap: 'calc(var(--gap) * 0.85)' }}>
        {section.items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid', position: 'relative', paddingInlineStart: timeline ? '1.1em' : 0, borderInlineStart: timeline ? '1.5px solid var(--line)' : 'none' }}>
            {timeline && <span style={{ position: 'absolute', insetInlineStart: '-0.36em', top: '0.35em', width: '0.62em', height: '0.62em', borderRadius: '50%', background: 'var(--accent)' }} />}
            <ItemHeader item={item} type={type} light={light} />
            <Description text={item.description} light={light} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <section data-section-id={section.id} style={{ marginBottom: 'var(--gap)' }}>
      <SectionTitle design={design} light={light}>
        {section.title}
      </SectionTitle>
      {body}
    </section>
  )
}

function Photo({ personal, design, size = '6.5em', ring }) {
  if (!design.photo || !personal.photo) return null
  const radius = design.photoShape === 'circle' ? '50%' : design.photoShape === 'rounded' ? '18%' : '4px'
  return <img src={personal.photo} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius, flexShrink: 0, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }} />
}

function Summary({ text, light }) {
  if (!text?.trim()) return null
  return (
    <p data-section-id="personal" style={{ margin: '0 0 var(--gap)', color: light ? 'rgba(255,255,255,0.9)' : 'var(--text)' }}>
      {text}
    </p>
  )
}

/* -------------------------------------------------------------- Templates */
function Modern({ resume, design }) {
  const { personal, sections } = resume
  return (
    <>
      <header data-section-id="personal" style={{ display: 'flex', alignItems: 'center', gap: '1.4em', marginBottom: 'var(--gap)', paddingBottom: 'var(--gap)', borderBottom: '1px solid var(--line)' }}>
        <Photo personal={personal} design={design} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.5em', lineHeight: 1.1, fontWeight: 700, color: 'var(--text)' }}>{personal.fullName}</h1>
          <p style={{ margin: '0.25em 0 0.7em', fontSize: '1.2em', color: 'var(--accent)', fontWeight: 600 }}>{personal.title}</p>
          <ContactList personal={personal} design={design} />
        </div>
      </header>
      <Summary text={personal.summary} />
      {sections.map((section) => (
        <Section key={section.id} section={section} design={design} />
      ))}
    </>
  )
}

function Sidebar({ resume, design }) {
  const { personal, sections } = resume
  const side = sections.filter((section) => SIDE_SECTIONS.includes(section.type))
  const main = sections.filter((section) => !SIDE_SECTIONS.includes(section.type))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34% 1fr', margin: 'calc(var(--margin) * -1)', minHeight: 'var(--page-height)' }}>
      <aside style={{ background: 'var(--accent-dark)', color: '#FFFFFF', padding: 'var(--margin) calc(var(--margin) * 0.7)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        {design.photo && personal.photo && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Photo personal={personal} design={design} size="8em" ring="rgba(255,255,255,0.35)" />
          </div>
        )}
        <div data-section-id="personal">
          <SectionTitle design={design} light>
            {resume.labels?.contact ?? 'Contact'}
          </SectionTitle>
          <ContactList personal={personal} design={design} vertical color="#FFFFFF" />
        </div>
        {side.map((section) => (
          <Section key={section.id} section={section} design={design} light />
        ))}
      </aside>
      <main style={{ padding: 'var(--margin) var(--margin) var(--margin) calc(var(--margin) * 0.8)' }}>
        <h1 data-section-id="personal" style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.4em', lineHeight: 1.1, fontWeight: 700 }}>{personal.fullName}</h1>
        <p style={{ margin: '0.3em 0 var(--gap)', fontSize: '1.15em', color: 'var(--accent)', fontWeight: 600 }}>{personal.title}</p>
        <Summary text={personal.summary} />
        {main.map((section) => (
          <Section key={section.id} section={section} design={design} />
        ))}
      </main>
    </div>
  )
}

function Classic({ resume, design }) {
  const { personal, sections } = resume
  const classicDesign = { ...design, headingStyle: design.headingStyle === 'accent' ? 'underline' : design.headingStyle }
  return (
    <>
      <header data-section-id="personal" style={{ textAlign: 'center', marginBottom: 'var(--gap)' }}>
        {design.photo && personal.photo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8em' }}>
            <Photo personal={personal} design={design} size="6em" />
          </div>
        )}
        <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.6em', fontWeight: 700, letterSpacing: '0.02em' }}>{personal.fullName}</h1>
        <p style={{ margin: '0.25em 0 0.7em', fontSize: '1.15em', fontStyle: 'italic', color: 'var(--muted)' }}>{personal.title}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ContactList personal={personal} design={design} separator />
        </div>
      </header>
      <div style={{ height: '2px', background: 'var(--accent)', margin: '0 0 var(--gap)' }} />
      <Summary text={personal.summary} />
      {sections.map((section) => (
        <Section key={section.id} section={section} design={classicDesign} />
      ))}
    </>
  )
}

function Minimal({ resume, design }) {
  const { personal, sections } = resume
  const quiet = { ...design, headingStyle: 'plain' }
  return (
    <>
      <header data-section-id="personal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5em', marginBottom: 'calc(var(--gap) * 1.6)' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.7em', fontWeight: 300, letterSpacing: '-0.01em' }}>{personal.fullName}</h1>
          <p style={{ margin: '0.3em 0 0', fontSize: '1.1em', color: 'var(--accent)' }}>{personal.title}</p>
        </div>
        <Photo personal={personal} design={design} size="5.5em" />
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '24% 1fr', columnGap: '1.6em', rowGap: 'var(--gap)' }}>
        <p style={{ margin: 0, fontSize: '0.85em', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{resume.labels?.contact ?? 'Contact'}</p>
        <ContactList personal={personal} design={design} />
        {personal.summary && (
          <>
            <p style={{ margin: 0, fontSize: '0.85em', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{resume.labels?.profile ?? 'Profile'}</p>
            <p style={{ margin: 0 }}>{personal.summary}</p>
          </>
        )}
        {sections
          .filter((section) => section.visible && section.items.length)
          .map((section) => (
            <div key={section.id} data-section-id={section.id} style={{ display: 'contents' }}>
              <p style={{ margin: 0, fontSize: '0.85em', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{section.title}</p>
              <div style={{ marginTop: '-0.2em' }}>
                <Section section={{ ...section, title: '' }} design={{ ...quiet, uppercaseHeadings: false }} />
              </div>
            </div>
          ))}
      </div>
    </>
  )
}

function Executive({ resume, design }) {
  const { personal, sections } = resume
  const side = sections.filter((section) => SIDE_SECTIONS.includes(section.type))
  const main = sections.filter((section) => !SIDE_SECTIONS.includes(section.type))
  return (
    <>
      <header data-section-id="personal" style={{ margin: 'calc(var(--margin) * -1) calc(var(--margin) * -1) var(--gap)', padding: 'calc(var(--margin) * 0.85) var(--margin)', background: 'var(--accent-dark)', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '1.4em' }}>
        <Photo personal={personal} design={design} size="6.5em" ring="rgba(255,255,255,0.35)" />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.6em', lineHeight: 1.1, fontWeight: 700 }}>{personal.fullName}</h1>
          <p style={{ margin: '0.25em 0 0.75em', fontSize: '1.15em', opacity: 0.9 }}>{personal.title}</p>
          <ContactList personal={personal} design={design} color="#FFFFFF" />
        </div>
      </header>
      <Summary text={personal.summary} />
      <div style={{ display: 'grid', gridTemplateColumns: side.length ? '1fr 32%' : '1fr', gap: '1.8em' }}>
        <div>
          {main.map((section) => (
            <Section key={section.id} section={section} design={design} />
          ))}
        </div>
        {side.length > 0 && (
          <div style={{ paddingInlineStart: '1.4em', borderInlineStart: '1px solid var(--line)' }}>
            {side.map((section) => (
              <Section key={section.id} section={section} design={design} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Compact({ resume, design }) {
  const { personal, sections } = resume
  const side = sections.filter((section) => SIDE_SECTIONS.includes(section.type))
  const main = sections.filter((section) => !SIDE_SECTIONS.includes(section.type))
  return (
    <>
      <header data-section-id="personal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em', marginBottom: 'var(--gap)' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2.1em', fontWeight: 800, color: 'var(--accent)' }}>{personal.fullName}</h1>
          <p style={{ margin: '0.15em 0 0.5em', fontWeight: 600 }}>{personal.title}</p>
          <ContactList personal={personal} design={design} />
        </div>
        <Photo personal={personal} design={design} size="5em" />
      </header>
      <Summary text={personal.summary} />
      <div style={{ display: 'grid', gridTemplateColumns: side.length ? '1fr 30%' : '1fr', gap: '1.6em' }}>
        <div>
          {main.map((section) => (
            <Section key={section.id} section={section} design={design} timeline={SECTION_TYPES[section.type].dated} />
          ))}
        </div>
        {side.length > 0 && (
          <div>
            {side.map((section) => (
              <Section key={section.id} section={section} design={design} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const TEMPLATE_COMPONENTS = { modern: Modern, sidebar: Sidebar, classic: Classic, minimal: Minimal, executive: Executive, compact: Compact }
const SPACING = { compact: 0.7, normal: 1, relaxed: 1.35 }

/** Mix a hex colour with white (amount 0–1) — used for soft accent backgrounds. */
function tint(hex, amount) {
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel) => Math.round(channel + (255 - channel) * amount)
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`
}
function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel) => Math.round(channel * (1 - amount))
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`
}

/**
 * The resume page itself, at real paper size (96 dpi). The same element is
 * shown scaled in the editor and used as-is for PDF / PNG export.
 */
export function ResumeDocument({ resume, design, labels, documentRef, id }) {
  const Template = TEMPLATE_COMPONENTS[design.template] ?? Modern
  const paper = PAPER[design.paper] ?? PAPER.a4
  const fonts = FONT_PAIRS[design.font] ?? FONT_PAIRS.inter
  const rtl = design.direction === 'rtl' || (design.direction === 'auto' && hasArabic(resume))
  const style = {
    '--accent': design.accent,
    '--accent-dark': shade(design.accent, 0.35),
    '--accent-soft': tint(design.accent, 0.88),
    '--accent-text': shade(design.accent, 0.15),
    '--text': '#111827',
    '--muted': '#4B5563',
    '--line': '#E5E7EB',
    '--font-heading': fonts.heading,
    '--font-body': fonts.body,
    '--gap': `${1.15 * (SPACING[design.spacing] ?? 1)}em`,
    '--margin': `${design.margin}px`,
    '--page-height': `${paper.height}px`,
    width: paper.width,
    minHeight: paper.height,
    padding: 'var(--margin)',
    boxSizing: 'border-box',
    background: '#FFFFFF',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: `${design.fontSize}pt`,
    lineHeight: design.lineHeight,
    overflow: 'hidden',
    position: 'relative',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  }
  return (
    <div ref={documentRef} id={id} dir={rtl ? 'rtl' : 'ltr'} lang={rtl ? 'ar' : 'en'} style={style}>
      <Template resume={{ ...resume, labels }} design={design} />
    </div>
  )
}
