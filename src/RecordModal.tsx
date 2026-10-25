import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'
import FOG from 'vanta/src/vanta.fog.js'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import albumArt from 'album-art'
import { Button, Container } from './vendor/liquid-glass/index.js'
import './vendor/liquid-glass/glass.css'
import CircularText from './reactbits/CircularText'
import { paintBackdrop, type Cover } from './covers'
import type { Album } from './data'

// liquid-glass sizes pills by measuring text in system-ui; measure in the font we actually render.
Button.measureText = (text: string, size: number) => {
  const c = document.createElement('canvas').getContext('2d')!
  c.font = `500 ${size}px "Libre Franklin"`
  return c.measureText(text)
}

type Props = { album: Album; cover: Cover; onClose: () => void; onStep: (dir: 1 | -1) => void }

export default function RecordModal({ album, cover, onClose, onStep }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const backdropHost = useRef<HTMLDivElement>(null)
  const [backdrop, setBackdrop] = useState<HTMLCanvasElement>()
  const art = useAlbumArt(album.after)

  useEffect(() => {
    const d = dialog.current!
    d.showModal()
    return () => d.close()
  }, [])

  // The blurred backdrop doubles as the image the glass buttons refract.
  useEffect(() => {
    const paint = () => {
      const c = paintBackdrop(cover.full, innerWidth, innerHeight)
      backdropHost.current!.replaceChildren(c)
      setBackdrop(c)
    }
    paint()
    addEventListener('resize', paint)
    return () => removeEventListener('resize', paint)
  }, [cover])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.liner__sleeve', { y: 50, rotate: -5, autoAlpha: 0, duration: 0.8 })
        .fromTo('.liner__disc', { xPercent: 0 }, { xPercent: 46, duration: 1.1, ease: 'power3.out' }, 0.3)
        // fade only: the glass samples the backdrop at its on-screen position, so it must not slide
        .from('.liner__glass-host', { autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, 0.1)
        .from('.liner__copy > *', { y: 18, autoAlpha: 0, stagger: 0.06, duration: 0.6 }, 0.15)
    }, dialog)
    return () => ctx.revert()
  }, [album.id])

  const half = Math.ceil(album.tracks.length / 2)
  // CircularText takes a pixel size; match the label (38% of a disc that is 94% of the record)
  const record = innerWidth <= 760 ? innerWidth * 0.62 : Math.min(innerHeight * 0.46, innerWidth * 0.32)
  const labelSize = Math.round(record * 0.94 * 0.38)

  return (
    <dialog
      ref={dialog}
      className="liner"
      aria-labelledby="liner-title"
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="liner__backdrop" ref={backdropHost} aria-hidden />
      <div className="liner__bar">
        <Glass snapshot={backdrop} text="Previous" onPress={() => onStep(-1)} />
        <Glass snapshot={backdrop} text="Next" onPress={() => onStep(1)} />
        <span className="liner__spacer" />
        <Glass snapshot={backdrop} text="Close" onPress={onClose} />
      </div>

      <div className="liner__grid" data-lenis-prevent>
        <div className="liner__record">
          <div className="liner__disc" aria-hidden>
            <div className="liner__vinyl">
              <div className="liner__label" style={{ background: album.label }}>
                <CircularText text={`${album.coverTitle} • MALHAR UDMALE • SIDE A • `} size={labelSize} fontSize={Math.max(8, labelSize * 0.075)} fontWeight={700} letterSpacing={1} color="rgba(0,0,0,0.78)" spinDuration={14} onHover="goBonkers" draggable />
              </div>
            </div>
          </div>
          <div className="liner__sleeve">
            <LiveCover album={album} cover={cover} />
          </div>
        </div>

        <div className="liner__notes">
          <GlassPanel snapshot={backdrop} />
          <div className="liner__copy">
            <p className="liner__after">
              <span className="liner__art">{art && <img src={art} alt={`${album.after.album} by ${album.after.artist}`} width={40} height={40} />}</span>
              <span>
                Sleeve after <cite>{album.after.album}</cite>, {album.after.artist} ({album.after.year})
              </span>
            </p>
            <h2 id="liner-title">{album.title}</h2>
            <p className="liner__meta">{album.meta}</p>
            <ol className="liner__tracks">
              {album.tracks.map((t, i) => (
                <li key={i}>
                  <span className="liner__no">{i < half ? `A${i + 1}` : `B${i - half + 1}`}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            {album.link && (
              <div className="liner__cta">
                <Glass snapshot={backdrop} text={album.link.label} role="link" size={16} onPress={() => window.open(album.link!.href, '_blank', 'noopener')} />
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}

function LiveCover({ album, cover }: { album: Album; cover: Cover }) {
  const alt = `Sleeve for ${album.title}, after ${album.after.album}`
  if (album.id === 'livelove')
    return (
      <div className="cover">
        <Fog />
        <img src={cover.fgUrl} alt={alt} />
      </div>
    )
  if (album.id === 'sacfm')
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
            color1="#123f57"
            color2="#020304"
            color3="#2b8cbf"
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

// Grey smoke drifting through the black-and-white flag of the LIVE.LOVE sleeve.
function Fog() {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fx = FOG({
      el: el.current,
      THREE,
      highlightColor: 0xdadada,
      midtoneColor: 0x707070,
      lowlightColor: 0x262626,
      baseColor: 0x0e0e0e,
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

// Frosted liquid-glass panel behind the liner notes, so the text reads on any cover.
// shortcut: renders once after the intro, so on phones (where the notes scroll) the refraction
// doesn't track scrolling; invisible over the blurred backdrop, revisit if the backdrop gets detail.
function GlassPanel({ snapshot }: { snapshot?: HTMLCanvasElement }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!snapshot) return
    Container.pageSnapshot = snapshot
    Container.fixedSnapshot = true
    const panel = new Container({ borderRadius: 28, type: 'rounded', tintOpacity: 0.2 })
    host.current!.appendChild(panel.element)
    const redraw = setTimeout(() => panel.render?.(), 1300)
    // keep the glass canvas the size of the notes (it only measures itself once otherwise)
    const resize = new ResizeObserver(() => {
      panel.updateSizeFromDOM()
      requestAnimationFrame(() => panel.render?.())
    })
    resize.observe(host.current!)
    return () => {
      clearTimeout(redraw)
      resize.disconnect()
      panel.destroy()
    }
  }, [snapshot])
  return <div ref={host} className="liner__glass-host" aria-hidden />
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
    // the glass only re-renders on scroll; redraw once the entrance animation has settled
    const redraw = setTimeout(() => b.render?.(), 1300)
    return () => {
      clearTimeout(redraw)
      b.destroy()
    }
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
