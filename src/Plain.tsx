import { useEffect } from 'react'
import { drawers, profile, type Album } from './data'

// Everything on one page, for a quick read or for printing. Same content as the tour, in résumé order.
export default function Plain() {
  useEffect(() => {
    const prev = document.title
    document.title = `${profile.name}, one-page version`
    return () => {
      document.title = prev
    }
  }, [])
  const byId = (id: string) => drawers.find(d => d.id === id)!.records
  return (
    <div className="plain">
      <nav className="plain__top" aria-label="Page">
        <a href="#">Take the tour</a>
        <a href={profile.resume} target="_blank" rel="noreferrer">
          Résumé (PDF)
        </a>
      </nav>
      <main className="plain__paper">
        <h1>{profile.name}</h1>
        <p className="plain__lede">
          {profile.program}, {profile.school}, {profile.years}. CGPA {profile.cgpa}.
        </p>
        <ul className="plain__contact">
          <li>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </li>
          <li>
            <a href={profile.github}>GitHub</a>
          </li>
          <li>
            <a href={profile.linkedin}>LinkedIn</a>
          </li>
        </ul>

        <Section title="Research" items={byId('research')} />
        <Section title="Projects" items={byId('projects')} />
        <Section title="Achievements" items={byId('achievements')} />

        <section aria-labelledby="plain-skills">
          <h2 id="plain-skills">Skills and interests</h2>
          <dl>
            <div>
              <dt>Research interests</dt>
              <dd>{profile.interests.join(', ')}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{profile.languages.join(', ')}</dd>
            </div>
            {Object.entries(profile.skills).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  )
}

function Section({ title, items }: { title: string; items: Album[] }) {
  const id = `plain-${title.toLowerCase()}`
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {items.map(r => (
        <article key={r.id}>
          <h3>{r.link ? <a href={r.link.href}>{r.title}</a> : r.title}</h3>
          <p className="plain__meta">{r.meta}</p>
          <ul>
            {r.tracks.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  )
}
