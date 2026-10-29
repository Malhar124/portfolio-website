import * as THREE from 'three'
import { ctx2d, grain, makeCanvas, seeded, text } from './covers'
import { profile } from './data'

const tex = (c: HTMLCanvasElement, repeat?: [number, number]) => {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

// Walnut. Every line follows one shared warp field so neighbouring grain runs parallel, like real wood.
export function woodTexture(seed: number, repeat: [number, number]) {
  const N = 1024
  const c = makeCanvas(N, N)
  const x = ctx2d(c)
  const r = seeded(seed)
  const ph = r() * 10
  const warp = (px: number, py: number) =>
    Math.sin(px * 0.0045 + py * 0.003 + ph) * 16 + Math.sin(px * 0.013 + py * 0.009 + ph * 2) * 4
  const path = (y0: number, wobble: number) => {
    x.beginPath()
    for (let px = -16; px <= N + 16; px += 16) {
      const py = y0 + warp(px, y0) + Math.sin(px * 0.03 + y0) * wobble
      if (px === -16) x.moveTo(px, py)
      else x.lineTo(px, py)
    }
  }
  x.fillStyle = '#5a3820'
  x.fillRect(0, 0, N, N)
  // broad colour bands give the figure
  for (let y = -40; y < N + 40; y += 8 + r() * 40) {
    x.strokeStyle = r() > 0.5 ? `rgba(130,84,48,${0.1 + r() * 0.16})` : `rgba(40,22,10,${0.1 + r() * 0.2})`
    x.lineWidth = 6 + r() * 34
    path(y, 0)
    x.stroke()
  }
  // fine grain
  for (let i = 0; i < 700; i++) {
    x.strokeStyle = `rgba(30,15,6,${0.05 + r() * 0.2})`
    x.lineWidth = 0.4 + r() * 1.1
    path(r() * (N + 80) - 40, r() * 1.5)
    x.stroke()
  }
  // open pores, short dashes along the grain
  x.fillStyle = 'rgba(20,10,4,0.3)'
  for (let i = 0; i < 2600; i++) {
    const px = r() * N
    const py = r() * N
    x.globalAlpha = 0.3 + r() * 0.7
    x.fillRect(px, py + warp(px, py), 3 + r() * 12, 1)
  }
  x.globalAlpha = 1
  grain(x, 0.1, N, N)
  return tex(c, repeat)
}

// Soft floor shadow under the desk (static: cheaper than a contact-shadow pass, and it stays put when the desk tilts).
export function shadowTexture() {
  const c = makeCanvas(256, 256)
  const x = ctx2d(c)
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 128)
  g.addColorStop(0, 'rgba(0,0,0,0.85)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

export function labelTexture(label: string) {
  // same aspect as the label plate on the drawer front (Scene.tsx LABEL)
  const c = makeCanvas(1600, 240)
  const x = ctx2d(c)
  x.fillStyle = '#efe3c6'
  x.fillRect(0, 0, 1600, 240)
  grain(x, 0.18, 1600, 240)
  // set like an old record label, in the introduction's display serif. One size for every drawer, set so the longest
  // name fits; +1 because canvas adds spacing after the last letter too
  text(x, label, 801, 172, '148px "DM Serif Display"', '#1f140b', { align: 'center', spacing: 2, fit: 1480 })
  return tex(c)
}

// The typed artist file lying on the desk.
export function dossierTexture() {
  const W = 1024
  const H = 1360
  const c = makeCanvas(W, H)
  const x = ctx2d(c)
  x.fillStyle = '#f2e9d7'
  x.fillRect(0, 0, W, H)
  grain(x, 0.2, W, H)
  const edge = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75)
  edge.addColorStop(0, 'rgba(120,90,50,0)')
  edge.addColorStop(1, 'rgba(120,90,50,0.22)')
  x.fillStyle = edge
  x.fillRect(0, 0, W, H)
  // a coffee ring, because this desk gets used
  x.strokeStyle = 'rgba(120,70,30,0.12)'
  x.lineWidth = 9
  x.beginPath()
  x.arc(W * 0.78, H * 0.86, 120, 0.3, Math.PI * 1.8)
  x.stroke()

  const ink = '#221c17'
  const faded = '#6b5c4c'
  const L = 78
  const type = (s: string, y: number, size = 38, weight = 400, color = ink) =>
    text(x, s, L, y, `${weight} ${size}px "Courier Prime"`, color)
  const rule = (y: number) => {
    x.fillStyle = 'rgba(34,28,23,0.55)'
    x.fillRect(L, y, W - L * 2, 2)
  }
  type('ARTIST FILE', 108, 34, 700)
  text(x, `No. ${profile.fileNo}`, W - L, 108, '400 34px "Courier Prime"', ink, { align: 'right' })
  rule(134)
  text(x, profile.name, L, 236, 'italic 600 88px "Bodoni Moda"', ink, { fit: W - L * 2 })
  type('B.Tech, Information Technology', 312)
  type('(Business Informatics), 2024 to now', 358)
  type('IIIT Allahabad', 404)
  text(x, `CGPA ${profile.cgpa}`, W - L, 404, '700 38px "Courier Prime"', ink, { align: 'right' })
  rule(446)
  type('ON RECORD', 508, 28, 700, faded)
  type('ICML 2026 workshop, co-author', 560)
  type('CVIP 2026, co-first author', 606)
  rule(648)
  type('LISTENS TO', 710, 28, 700, faded)
  ;['Mechanistic interpretability,', 'AI alignment and security,', 'federated learning, medical', 'imaging, low-latency systems,', 'high-performance computing'].forEach(
    (l, i) => type(l, 762 + i * 46),
  )
  rule(1000)
  type('PLAYS', 1062, 28, 700, faded)
  type(profile.languages.join('  '), 1114)
  type(profile.email, 1250, 30, 400, faded)

  // rubber stamp
  x.save()
  x.translate(W * 0.66, H * 0.5)
  x.rotate(-0.16)
  x.globalAlpha = 0.72
  x.strokeStyle = '#b3261e'
  x.lineWidth = 7
  x.strokeRect(-190, -78, 380, 156)
  x.lineWidth = 2.5
  x.strokeRect(-178, -66, 356, 132)
  text(x, 'ACCEPTED', 0, -6, '700 70px "Courier Prime"', '#b3261e', { align: 'center', spacing: 6 })
  text(x, 'ICML 2026   CVIP 2026', 0, 44, '700 28px "Courier Prime"', '#b3261e', { align: 'center' })
  x.globalCompositeOperation = 'destination-out'
  const r = seeded(41)
  for (let i = 0; i < 500; i++) {
    x.globalAlpha = r() * 0.8
    x.beginPath()
    x.arc(-200 + r() * 400, -85 + r() * 170, r() * 3.2, 0, Math.PI * 2)
    x.fill()
  }
  x.restore()
  return tex(c)
}

export function vinylTexture(label: string, title: string) {
  const c = makeCanvas(1024, 1024)
  const x = ctx2d(c)
  const C = 512
  x.fillStyle = '#0b0b0c'
  x.beginPath()
  x.arc(C, C, 512, 0, Math.PI * 2)
  x.fill()
  for (let r = 500; r > 180; r -= 3) {
    x.strokeStyle = r % 9 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)'
    x.lineWidth = 1
    x.beginPath()
    x.arc(C, C, r, 0, Math.PI * 2)
    x.stroke()
  }
  x.fillStyle = label
  x.beginPath()
  x.arc(C, C, 170, 0, Math.PI * 2)
  x.fill()
  text(x, title, C, C - 60, '700 30px Archivo', 'rgba(0,0,0,0.75)', { align: 'center', fit: 260 })
  text(x, 'MALHAR UDMALE', C, C + 80, '600 22px Archivo', 'rgba(0,0,0,0.65)', { align: 'center', spacing: 4 })
  x.fillStyle = '#0b0b0c'
  x.beginPath()
  x.arc(C, C, 14, 0, Math.PI * 2)
  x.fill()
  return tex(c)
}

// Shown until public/photo.jpg exists: a sepia studio portrait silhouette.
export function photoPlaceholder() {
  const c = makeCanvas(600, 780)
  const x = ctx2d(c)
  const g = x.createRadialGradient(300, 300, 40, 300, 360, 520)
  g.addColorStop(0, '#b89a74')
  g.addColorStop(1, '#3b2a1c')
  x.fillStyle = g
  x.fillRect(0, 0, 600, 780)
  x.fillStyle = '#2a1d13'
  x.beginPath()
  x.ellipse(300, 330, 108, 132, 0, 0, Math.PI * 2)
  x.fill()
  x.beginPath()
  x.ellipse(300, 820, 270, 330, 0, Math.PI, 0)
  x.fill()
  grain(x, 0.3, 600, 780)
  return tex(c)
}

// Cover-fits the photo into a frame of the given aspect (width / height), keeping the top (faces).
export function photoTexture(src: string, aspect: number, onLoad: (t: THREE.Texture) => void) {
  new THREE.TextureLoader().load(src, t => {
    const img = t.image as HTMLImageElement
    const a = img.width / img.height
    if (a > aspect) {
      t.repeat.x = aspect / a
      t.offset.x = (1 - t.repeat.x) / 2
    } else {
      t.repeat.y = a / aspect
      t.offset.y = (1 - t.repeat.y) * 0.8
    }
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    onLoad(t)
  })
}
