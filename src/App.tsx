import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import Stage from './Scene'
import { paintCovers, type Cover } from './covers'
import { allRecords, drawers, profile, type CoverId } from './data'
import { sound } from './sound'
import { stage } from './stage'
import ContactCover from './ContactCover'
import LightRays from './reactbits/LightRays'
import Magnet from './reactbits/Magnet'

// The record modal pulls in Vanta, ShaderGradient and liquid-glass; load it on first open.
const RecordModal = lazy(() => import('./RecordModal'))

gsap.registerPlugin(ScrollTrigger)

const FONTS = [
  'italic 500 40px "Bodoni Moda"',
  'italic 600 40px "Bodoni Moda"',
  '400 40px "Courier Prime"',
  '700 40px "Courier Prime"',
  '600 40px "Bodoni Moda"',
  '500 40px Archivo',
  '800 40px Archivo',
  '40px Fruktur',
  '40px Yellowtail',
]

// Scroll timeline, in units of SCROLL_PER_UNIT viewport heights of scrolling.
const CHAPTER = [1.5, 3.5, 5.5] // each drawer gets two units
const END = 8.3
// how much scrolling one timeline unit takes, in viewport heights; raise it to make scrolling less sensitive
const SCROLL_PER_UNIT = 1.3
const BEAM_SHIFT = (-0.17 / 1.4) * 100
// with an album window open the desk moves a further 7% aside (see Rig in Scene.tsx)
const BEAM_ALBUM = (-0.24 / 1.4) * 100
const SECTIONS = [
  ['projects', 'Projects'],
  ['research', 'Research'],
  ['achievements', 'Achievements'],
  ['contact', 'Contact'],
] as const
type Section = 'desk' | (typeof SECTIONS)[number][0]
// where go() can take the tour: a section, or the front of the desk with every drawer shut
type Stop = Section | 'front'
const sectionAt = (t: number): Section =>
  t < 1.4 ? 'desk' : t < 3.4 ? 'projects' : t < 5.4 ? 'research' : t < 7.4 ? 'achievements' : 'contact'

type Modal = { kind: 'record'; id: CoverId } | { kind: 'file' } | null

export default function App() {
  const [covers, setCovers] = useState<Map<CoverId, Cover>>()
  const [active, setActive] = useState<Section>('desk')
  const [modal, setModal] = useState<Modal>(null)
  const lenis = useRef<Lenis>(null)
  const timeline = useRef<gsap.core.Timeline>(null)
  const jump = useRef<gsap.core.Timeline>(null)
  const [soundOn, setSoundOn] = useState(sound.enabled)

  useEffect(() => {
    // never hang on a slow font CDN: paint with fallbacks after 4s
    const timeout = new Promise(r => setTimeout(r, 4000))
    const fonts = Promise.all(FONTS.map(f => document.fonts.load(f)))
    Promise.race([fonts, timeout]).then(() => setCovers(paintCovers()))
  }, [])

  // a sound setting remembered from an earlier visit can only start after the first click or key press
  useEffect(() => {
    const unlock = () => sound.unlock()
    addEventListener('pointerdown', unlock, { once: true })
    addEventListener('keydown', unlock, { once: true })
    return () => {
      removeEventListener('pointerdown', unlock)
      removeEventListener('keydown', unlock)
    }
  }, [])

  useLayoutEffect(() => {
    if (!covers) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const l = new Lenis({ lerp: 0.085, smoothWheel: !reduced })
    lenis.current = l
    l.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => l.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.track',
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduced ? true : 0.7,
          onUpdate: self => setActive(sectionAt(self.progress * END)),
        },
      })
      timeline.current = tl
      tl.addLabel('desk', 0)
        .to('.hero', { autoAlpha: 0, y: -16, duration: 0.25 }, 0.05)
        .to(stage, { turn: 1, duration: 1.1, ease: 'power2.inOut' }, 0)
        .fromTo('.front-hint', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 1.05)
        .addLabel('front', 1.3) // facing the drawers, all shut: where closing a drawer goes back to
        .to('.front-hint', { autoAlpha: 0, duration: 0.12 }, CHAPTER[0] - 0.05)
        .to(stage, { shift: 1, duration: 0.5, ease: 'power2.inOut' }, CHAPTER[0])
        // the lamp follows the desk when it slides aside: 17% of the screen, and the beam layer is 140% wide
        .to('.beam', { xPercent: BEAM_SHIFT, duration: 0.5, ease: 'power2.inOut' }, CHAPTER[0])
      drawers.forEach((d, i) => {
        const s = CHAPTER[i]
        const dr = stage.drawers[i]
        const panel = `#crate-${d.id}`
        tl.to(dr, { open: 1, duration: 0.45, ease: 'power2.out' }, s)
          // records move only while the drawer is fully open, or they would cut through the cabinet
          .to(dr, { rise: 1, duration: 0.5, ease: 'power1.inOut' }, s + 0.45)
          .fromTo(panel, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, s + 0.5)
          .addLabel(d.id, s + 1)
          .to(panel, { autoAlpha: 0, y: -28, duration: 0.25, ease: 'power2.in' }, s + 1.55)
          .to(dr, { rise: 0, duration: 0.3, ease: 'power1.in' }, s + 1.55)
          .to(dr, { open: 0, duration: 0.3, ease: 'power2.in' }, s + 1.85)
      })
      tl.to(stage, { outro: 1, duration: 0.6, ease: 'power2.inOut' }, 7.4)
        .fromTo('.contact', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 7.6)
        // the contact sleeve arrives face up, then turns over to the details on its back
        .fromTo('.sleeve', { rotateY: 0 }, { rotateY: 180, duration: 0.45, ease: 'power2.inOut' }, 7.85)
        .addLabel('contact', END)
        .set({}, {}, END) // pins the timeline length to END so it matches the track height
      // Record every tween's starting values now. Otherwise each records them when first reached, and a nav jump
      // that has already moved the drawers would be recorded as the start (scrolling back would then do nothing).
      tl.progress(1).progress(0)

      // Intro: the room starts dark, the desk lamp clicks on with one filament flicker, then the hero controls appear.
      if (!reduced) {
        const beam = document.querySelector<HTMLElement>('.beam')!
        stage.lamp = 0
        beam.style.opacity = '0'
        gsap.set(['.hero .chip', '.hero__cue'], { autoAlpha: 0, y: 10 })
        gsap
          .timeline({ delay: 0.9, onUpdate: () => (beam.style.opacity = String(stage.lamp)) })
          .call(sound.click)
          .to(stage, { lamp: 0.75, duration: 0.05 })
          .to(stage, { lamp: 0.12, duration: 0.08 })
          .to(stage, { lamp: 0.9, duration: 0.06 })
          .to(stage, { lamp: 0.4, duration: 0.1 })
          .to(stage, { lamp: 1, duration: 0.7, ease: 'power2.out' })
          .to(['.hero .chip', '.hero__cue'], { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      }
    })

    return () => {
      ctx.revert()
      gsap.ticker.remove(raf)
      l.destroy()
    }
  }, [covers])

  useEffect(() => {
    if (modal) lenis.current?.stop()
    else lenis.current?.start()
  }, [modal])

  // Clicking a drawer or nav link goes straight there. Scrolling would play every chapter in between, so instead:
  // pause the scroll timeline, jump the page invisibly, animate only what changes (put the current records and
  // drawer away, then open the clicked one), and hand control back to the scroll timeline at the same state.
  const go = (label: Stop) => {
    const tl = timeline.current
    const st = tl?.scrollTrigger
    const l = lenis.current
    if (!tl || !st || !l) return
    jump.current?.kill()
    st.disable(false)
    l.stop()
    l.scrollTo(st.labelToScroll(label), { immediate: true, force: true })
    setActive(label === 'front' ? 'desk' : label)

    const target = drawers.findIndex(d => d.id === label)
    const aside = label !== 'desk' && label !== 'front' // the desk slides aside for a crate card or the contact sleeve
    const overlay = document.querySelector<HTMLElement>(
      label === 'desk' ? '.hero' : label === 'front' ? '.front-hint' : label === 'contact' ? '.contact' : `#crate-${label}`,
    )!
    const others = gsap.utils.toArray<HTMLElement>('.hero, .front-hint, .crate, .contact').filter(el => el !== overlay)
    const closing = stage.drawers.filter((d, i) => i !== target && (d.open > 0.001 || d.rise > 0.001))
    const finish = () => {
      // A scrub still settling from the last scroll was only paused by disable(). Finish it first: left paused, the
      // next scroll update plays it out and puts the scene back where that scroll was heading, so the drawer would
      // shut and open a second time.
      st.getTween()?.progress(1)
      tl.progress(tl.labels[label] / tl.duration()) // the exact state this scroll position maps to
      st.enable(false, false)
      l.start()
      jump.current = null
    }
    const j = gsap.timeline({ onComplete: finish })
    jump.current = j
    j.to(others, { autoAlpha: 0, duration: 0.25 }, 0)
    // records go back in before their drawer closes, so they never cut through the wood
    if (closing.length) j.to(closing, { rise: 0, duration: 0.35, ease: 'power1.in' }, 0).to(closing, { open: 0, duration: 0.3, ease: 'power2.in' })
    j.to(stage, { turn: label === 'desk' ? 0 : 1, shift: aside ? 1 : 0, outro: label === 'contact' ? 1 : 0, duration: 0.9, ease: 'power2.inOut' }, closing.length ? 0.3 : 0)
    j.to('.beam', { xPercent: aside ? BEAM_SHIFT : 0, duration: 0.9, ease: 'power2.inOut' }, '<')
    if (target >= 0) {
      const d = stage.drawers[target]
      j.to(d, { open: 1, duration: 0.45, ease: 'power2.out' }, '>-0.25').to(d, { rise: 1, duration: 0.6, ease: 'power1.inOut' })
    }
    if (Number(gsap.getProperty(overlay, 'opacity')) < 0.05) gsap.set(overlay, { y: label === 'desk' ? 0 : 28 })
    j.to(overlay, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '>-0.35')
    if (label === 'contact') j.to('.sleeve', { rotateY: 180, duration: 0.6, ease: 'power2.inOut' })
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) j.progress(1)
  }
  // Opening a record: the desk shrinks, moves aside and tips its top towards us, the record flies onto the turntable
  // and plays, and its album window opens where the crate card was. Scrolling stays off until the window is closed
  // (see the modal effect above).
  const openRecord = (id: CoverId) => {
    if (jump.current || modal) return
    stage.hover = ''
    setModal({ kind: 'record', id })
    const deck = stage.deck
    const t = gsap
      .timeline({ defaults: { ease: 'power2.inOut' } })
      .to('.overlay', { autoAlpha: 0, duration: 0.25 }, 0)
      // records go back into the drawer while the desk tips forward (see riseOf in Scene.tsx); the disc leaves its
      // sleeve at 0.45s, before the sleeve has moved far, and lands on the platter once the table top faces us
      .to(stage, { album: 1, duration: 1.1, overwrite: 'auto' }, 0.3)
      .to('.beam', { xPercent: BEAM_ALBUM, duration: 1.1 }, 0.3)
    if (deck.id !== id) {
      sound.cue(allRecords.find(r => r.id === id)!.song.file) // in the click itself, so the browser lets the music start when the needle lands
      setSoundOn(sound.enabled)
      if (deck.id) t.to(deck, { arm: 0, duration: 0.4 }, 0) // lift the arm off the last record
      t.call(() => void Object.assign(deck, { id, drop: 0, arm: 0 }), [], 0.45) // the disc leaves its sleeve
        .to(deck, { drop: 1, duration: 0.9 }, 0.5)
        .to(deck, { arm: 1, duration: 0.5 }, 1.35)
        .call(sound.needle, [], 1.85)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) t.progress(1)
  }
  // Closing keeps the record spinning on the turntable and brings the desk and the crate card back.
  const closeRecord = () => {
    setModal(null)
    gsap
      .timeline({ defaults: { ease: 'power2.inOut' } })
      .to(stage, { album: 0, duration: 1, overwrite: 'auto' }, 0)
      .to('.beam', { xPercent: BEAM_SHIFT, duration: 1 }, 0)
      .to('.overlay', { autoAlpha: 1, duration: 0.35 }, 0.7)
  }
  const toggleSound = () => {
    sound.setEnabled(!soundOn)
    setSoundOn(!soundOn)
  }
  const album = modal?.kind === 'record' ? allRecords.find(r => r.id === modal.id) : undefined
  const shelf = album && drawers.find(d => d.records.includes(album))!.name

  return (
    <>
      <div className={`loader${covers ? ' loader--done' : ''}`} aria-hidden={!!covers}>
        <span className="loader__disc" />
        <p>Dropping the needle</p>
      </div>

      {covers && (
        <>
          {/* the desk lamp: a slow, warm beam behind the desk */}
          <div className="beam" aria-hidden>
            <LightRays
              raysOrigin="top-center"
              raysColor="#ffd9a8"
              raysSpeed={0.35}
              lightSpread={0.42}
              rayLength={2.8}
              fadeDistance={1.25}
              intensity={0.8}
              glow={0.45}
              haze={0.35}
              saturation={0.85}
              mouseInfluence={0.04}
              cursorShadow={false}
              clickPulse={false}
              maxDevicePixelRatio={1}
              intro={false}
            />
          </div>
          <Stage covers={covers} paused={modal?.kind === 'file'} onRecord={openRecord} onDrawer={i => go(active === drawers[i].id ? 'front' : drawers[i].id)} onFile={() => setModal({ kind: 'file' })} />

          <header className="nav">
            <button className="nav__brand" onClick={() => go('desk')} aria-label="Back to the desk">
              <span className="nav__full">{profile.name}</span>
              <span className="nav__short" aria-hidden>
                MU
              </span>
            </button>
            <nav aria-label="Sections">
              <ul>
                {SECTIONS.map(([id, label]) => (
                  <li key={id}>
                    <button className="nav__link" aria-current={active === id ? 'true' : undefined} onClick={() => go(id)}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <main className="overlay">
            <section className="hero" aria-labelledby="hero-name">
              <h1 id="hero-name" className="sr-only">
                {profile.name}
              </h1>
              <p className="sr-only">
                {profile.program}, {profile.school}. Research on multilingual refusal in language models (ICML 2026 workshop) and
                federated bladder tumour segmentation (CVIP 2026).
              </p>
              <div className="hero__actions">
                <button className="chip" onClick={() => setModal({ kind: 'file' })}>
                  Read the file
                </button>
                <a className="chip" href="#plain">
                  Skip the tour
                </a>
              </div>
              <p className="hero__cue">Scroll to turn the desk</p>
            </section>

            <p className="front-hint">Keep scrolling to open each drawer, or click one.</p>

            <div className="crates">
              {drawers.map(d => (
                <section key={d.id} id={`crate-${d.id}`} className="crate" aria-labelledby={`crate-${d.id}-title`}>
                  <h2 id={`crate-${d.id}-title`} className="crate__tab">
                    {d.name}
                  </h2>
                  <p className="crate__blurb">{d.blurb}</p>
                  <ul className="crate__list" data-lenis-prevent>
                    {d.records.map(r => (
                      <li key={r.id}>
                        <button
                          className="crate__item"
                          onClick={() => openRecord(r.id)}
                          onPointerEnter={() => (stage.hover = r.id)}
                          onPointerLeave={() => (stage.hover = '')}
                          onFocus={() => (stage.hover = r.id)}
                          onBlur={() => (stage.hover = '')}
                        >
                          <img src={covers.get(r.id)!.url} alt="" width={64} height={64} />
                          <span className="crate__title">{r.title}</span>
                          <span className="crate__meta">{r.meta}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <section className="contact" aria-labelledby="contact-title">
                <div className="sleeve">
                  <ContactCover />
                  <div className="sleeve__back">
                    <header className="contact__head">
                      <h2 id="contact-title">Contact</h2>
                      <span>{profile.name}</span>
                    </header>
                    <p className="contact__note">Email is the fastest way to reach me. Code lives on GitHub.</p>
                    {/* written like the credits on the back of a sleeve */}
                    <ul className="contact__links">
                      {[
                        ['Booking', `mailto:${profile.email}`, profile.email],
                        ['Label', profile.github, 'github.com/Malhar124'],
                        ['Press', profile.linkedin, 'linkedin.com/in/malhar-udmale'],
                        ['Press kit', profile.resume, 'Résumé, one-page PDF'],
                      ].map(([role, href, name]) => (
                        <li key={role}>
                          <Magnet padding={40} magnetStrength={4} style={{ display: 'block' }}>
                            <a href={href} target={href.startsWith('http') || href.endsWith('.pdf') ? '_blank' : undefined} rel="noreferrer">
                              <span className="contact__role">{role}</span>
                              <span className="contact__name">{name}</span>
                            </a>
                          </Magnet>
                        </li>
                      ))}
                    </ul>
                    <footer className="contact__foot">
                      <p className="contact__plain">
                        <a href="#plain">One-page version</a> for a quick read or for printing.
                      </p>
                      <figure className="contact__barcode">
                        <Barcode value={profile.fileNo} />
                        <figcaption>Cat. no. {profile.fileNo}</figcaption>
                      </figure>
                    </footer>
                  </div>
                </div>
              </section>
            </div>
          </main>

          <button className="sound" aria-label="Sound" aria-pressed={soundOn} onClick={toggleSound}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none" />
              {soundOn ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
            <span className="sound__label">{soundOn ? 'Sound on' : 'Sound off'}</span>
          </button>

          <div className="track" style={{ height: `${(END * SCROLL_PER_UNIT + 1) * 100}vh` }} aria-hidden />
        </>
      )}

      {modal?.kind === 'file' && <FileSheet onClose={() => setModal(null)} />}
      {album && covers && (
        <Suspense>
          <RecordModal album={album} shelf={shelf!} cover={covers.get(album.id)!} onClose={closeRecord} />
        </Suspense>
      )}

    </>
  )
}

// Code 39 (1 = wide element, bar and space alternating, starting with a bar), so the barcode really scans as the
// catalogue number. shortcut: only the characters in the catalogue number; add rows from the Code 39 table if it changes.
const CODE39: Record<string, string> = {
  '*': '010010100',
  '0': '000110100',
  '2': '001100001',
  '4': '000110001',
  B: '001001001',
  I: '001001100',
}

function Barcode({ value }: { value: string }) {
  const bars: [number, number][] = []
  let x = 10 // quiet zone
  for (const ch of `*${value}*`) {
    ;[...CODE39[ch]].forEach((wide, i) => {
      const w = wide === '1' ? 2 : 1
      if (i % 2 === 0) bars.push([x, w])
      x += w
    })
    x += 1 // gap between characters
  }
  x += 9
  return (
    <svg viewBox={`0 0 ${x} 34`} width={x} height={34} shapeRendering="crispEdges" aria-hidden>
      <rect width={x} height={34} fill="var(--paper)" />
      {bars.map(([bx, w]) => (
        <rect key={bx} x={bx} width={w} height={34} fill="var(--ink)" />
      ))}
    </svg>
  )
}

// The artist file, readable at any screen size.
function FileSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    d.showModal()
    return () => d.close()
  }, [])
  const rows: [string, string][] = [
    ['School', profile.school],
    ['Program', `${profile.program}, ${profile.years}`],
    ['CGPA', profile.cgpa],
    ['Research interests', profile.interests.join(', ')],
    ['Languages', profile.languages.join(', ')],
    ...Object.entries(profile.skills),
  ]
  return (
    <dialog
      ref={ref}
      className="file"
      aria-labelledby="file-title"
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
      onClick={e => e.target === ref.current && onClose()}
    >
      <article className="file__paper" data-lenis-prevent>
        <header className="file__head">
          <span>Artist file</span>
          <span>No. {profile.fileNo}</span>
        </header>
        <div className="file__id">
          <span className="file__photo">
            {/* zoomed in on profile.photoFocus: the photo is a full-length shot, the thumbnail is 84px wide */}
            <img
              src={profile.photo}
              alt=""
              onError={e => (e.currentTarget.parentElement!.hidden = true)}
              style={{ transform: `scale(2.4) translate(${(0.5 - profile.photoFocus[0]) * 100}%, ${(0.5 - profile.photoFocus[1]) * 100}%)` }}
            />
          </span>
          <h2 id="file-title">{profile.name}</h2>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>Contact</dt>
            <dd>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>, <a href={profile.github}>GitHub</a>,{' '}
              <a href={profile.linkedin}>LinkedIn</a>
            </dd>
          </div>
        </dl>
        <button className="chip chip--ink" onClick={onClose} autoFocus>
          Close the file
        </button>
      </article>
    </dialog>
  )
}
