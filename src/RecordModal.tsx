import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'
import FOG from 'vanta/src/vanta.fog.js'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import albumArt from 'album-art'
import { Button, Container } from './vendor/liquid-glass/index.js'
import './vendor/liquid-glass/glass.css'
import CircularText from './reactbits/CircularText'
import { ctx2d, makeCanvas, paintBackdrop, type Cover } from './covers'
import type { Album } from './data'

// liquid-glass sizes pills by measuring text in system-ui; measure in the font we actually render.
Button.measureText = (text: string, size: number) => {
  const c = document.createElement('canvas').getContext('2d')!
  c.font = `500 ${size}px "Libre Franklin"`
  return c.measureText(text)
}

type Props = { album: Album; shelf: string; cover: Cover; onClose: () => void }

// The album window: a larger crate card beside the shrunken desk. The sleeve and its record sit on a banner of the
// cover's own colours, the glass buttons sit on that banner, and the notes below scroll on their own.
export default function RecordModal({ album, shelf, cover, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement>()
  const closing = useRef(false)
  const art = useAlbumArt(album.after)
  const phone = innerWidth <= 760
  const sleeve = phone ? 112 : Math.round(Math.min(210, Math.max(150, innerWidth * 0.14)))
  // CircularText takes a pixel size; match the label (38% of a disc that is 94% of the sleeve)
  const labelSize = Math.round(sleeve * 0.94 * 0.38)

  useEffect(() => {
    const d = dialog.current!
    d.showModal()
    return () => d.close()
  }, [])

  // The banner is the cover blurred down to its colours. The glass buttons refract it, so they get a page-sized
  // snapshot with the banner drawn where it sits once the window has settled.
  const paintGlow = (settled: boolean) => {
    const host = glow.current
    if (!host) return
    const r = host.getBoundingClientRect()
    const blur = paintBackdrop(cover.full, Math.round(r.width), Math.round(r.height))
    host.replaceChildren(blur)
    if (!settled) return
    const page = makeCanvas(innerWidth, innerHeight)
    ctx2d(page).drawImage(blur, r.left, r.top)
    setSnapshot(page)
  }

  useLayoutEffect(() => {
    paintGlow(false)
    const ctx = gsap.context(() => {
      const t = gsap
        .timeline({ defaults: { ease: 'expo.out' }, onComplete: () => paintGlow(true) })
        .from(card.current, { [phone ? 'y' : 'x']: 40, autoAlpha: 0, duration: 0.5 })
        .from('.album__sleeve', { y: 20, rotate: -4, duration: 0.7 }, 0.1)
        .fromTo('.album__disc', { xPercent: 0 }, { xPercent: 46, duration: 1, ease: 'power3.out' }, 0.35)
        .from('.album__notes > *', { y: 14, autoAlpha: 0, stagger: 0.05, duration: 0.5 }, 0.2)
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) t.progress(1)
    }, dialog)
    // keep the banner, and the snapshot the glass refracts, in step with the layout
    const resize = () => paintGlow(true)
    addEventListener('resize', resize)
    return () => {
      ctx.revert()
      removeEventListener('resize', resize)
    }
  }, [album.id])

  // leave quicker than it arrived, then hand back to the page
  const close = () => {
    if (closing.current) return
    closing.current = true
    gsap.to(card.current, { [phone ? 'y' : 'x']: 24, autoAlpha: 0, duration: 0.22, ease: 'power2.in', onComplete: onClose })
  }

  const half = Math.ceil(album.tracks.length / 2)

  return (
    <dialog
      ref={dialog}
      className="album"
      aria-labelledby="album-title"
      onCancel={e => {
        e.preventDefault()
        close()
      }}
      onClick={e => e.target === dialog.current && close()}
    >
      <article ref={card} className="album__card" style={{ '--sleeve': `${sleeve}px` } as CSSProperties}>
        <span className="album__tab" aria-hidden>
          {shelf}
        </span>
        <div className="album__banner">
          <div className="album__glow" ref={glow} aria-hidden />
          <div className="album__record">
            <div className="album__disc" aria-hidden>
              <div className="album__vinyl">
                <div className="album__label" style={{ background: album.label }}>
                  <CircularText text={`${album.coverTitle} • MALHAR UDMALE • SIDE A • `} size={labelSize} fontSize={Math.max(7, labelSize * 0.075)} fontWeight={700} letterSpacing={1} color="rgba(0,0,0,0.78)" spinDuration={14} onHover="goBonkers" draggable />
                </div>
              </div>
            </div>
            <div className="album__sleeve">
              <LiveCover album={album} cover={cover} />
            </div>
          </div>
          <div className="album__actions">
            <Glass snapshot={snapshot} text="Close" onPress={close} />
            {album.link && <Glass snapshot={snapshot} text={album.link.label} role="link" onPress={() => window.open(album.link!.href, '_blank', 'noopener')} />}
          </div>
        </div>

        <div className="album__notes" data-lenis-prevent>
          <p className="album__after">
            <span className="album__art">{art && <img src={art} alt={`${album.after.album} by ${album.after.artist}`} width={32} height={32} />}</span>
            <span>
              Sleeve after <cite>{album.after.album}</cite>, {album.after.artist}
              {album.after.year && ` (${album.after.year})`}
            </span>
          </p>
          <h2 id="album-title">{album.title}</h2>
          <p className="album__meta">{album.meta}</p>
          <ol className="album__tracks">
            {album.tracks.map((t, i) => (
              <li key={i}>
                <span className="album__no">{i < half ? `A${i + 1}` : `B${i - half + 1}`}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </dialog>
  )
}

function LiveCover({ album, cover }: { album: Album; cover: Cover }) {
  const alt = `Sleeve for ${album.title}, after ${album.after.album}`
  if (album.id === 'prom')
    return (
      <div className="cover">
        <Fog />
        <img src={cover.fgUrl} alt={alt} />
      </div>
    )
  if (album.id === 'starboy')
    return (
      <div className="cover">
        <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45} pointerEvents="none">
          <ShaderGradient
            control="props"
            type="plane"
            animate="on"
            uSpeed={0.12}
            uStrength={2.2}
            uDensity={1.1}
            uFrequency={5.5}
            uAmplitude={1}
            color1="#ef2a42"
            color2="#8a0a1f"
            color3="#ff5a6a"
            lightType="3d"
            brightness={1.1}
            cAzimuthAngle={180}
            cPolarAngle={90}
            cDistance={3.2}
            rotationZ={-60}
            grain="off"
          />
        </ShaderGradientCanvas>
        <img src={cover.fgUrl} alt={alt} />
      </div>
    )
  return (
    <div className="cover">
      <img src={cover.url} alt={alt} />
    </div>
  )
}

// Warm haze hanging in the hall on the Alone at Prom sleeve.
function Fog() {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fx = FOG({
      el: el.current,
      THREE,
      highlightColor: 0xffb060,
      midtoneColor: 0xa8481a,
      lowlightColor: 0x2a0d05,
      baseColor: 0x0d0503,
      blurFactor: 0.62,
      speed: 1.3,
      zoom: 0.75,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
    })
    return () => fx.destroy()
  }, [])
  return <div ref={el} className="cover__live" />
}

function Glass({ snapshot, text, onPress, role = 'button', size = 14 }: { snapshot?: HTMLCanvasElement; text: string; onPress: () => void; role?: string; size?: number }) {
  const host = useRef<HTMLSpanElement>(null)
  const press = useRef(onPress)
  press.current = onPress
  useEffect(() => {
    if (!snapshot) return
    Container.pageSnapshot = snapshot
    Container.fixedSnapshot = true
    const b = new Button({ text, size, type: 'pill', tintOpacity: 0.22, onClick: () => press.current() })
    const el = b.element
    el.setAttribute('role', role)
    el.tabIndex = 0
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        press.current()
      }
    })
    host.current!.appendChild(el)
    return () => b.destroy()
  }, [snapshot, text, role, size])
  return <span ref={host} className="glass-host" />
}

const artCache = new Map<string, Promise<string>>()
// Real cover thumbnail for the "sleeve after" credit, via album-art (Spotify). Silent if it fails.
function useAlbumArt({ artist, album }: Album['after']) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let live = true
    setSrc(undefined)
    const key = `${artist}/${album}`
    if (!artCache.has(key)) artCache.set(key, albumArt(artist, { album, size: 'small' }))
    artCache
      .get(key)!
      .then(url => live && typeof url === 'string' && url.startsWith('http') && setSrc(url))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [artist, album])
  return src
}
