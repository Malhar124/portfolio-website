// Album sleeves painted on <canvas>. Each design has a background and a foreground layer so the
// record modal can swap the background for a live effect (Vanta fog, ShaderGradient) while the
// typography stays identical to the 3D sleeve.
import type { CoverId } from './data'

export const S = 1024
type Ctx = CanvasRenderingContext2D

export const makeCanvas = (w = S, h = S) => Object.assign(document.createElement('canvas'), { width: w, height: h })
export const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d')!

// Seeded so every visitor gets the same artwork.
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

let noiseTile: HTMLCanvasElement | undefined
export function grain(ctx: Ctx, alpha: number, w = S, h = S) {
  if (!noiseTile) {
    noiseTile = makeCanvas(256, 256)
    const c = ctx2d(noiseTile)
    const img = c.createImageData(256, 256)
    const r = seeded(11)
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = r() * 255
      img.data[i + 3] = 255
    }
    c.putImageData(img, 0, 0)
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat')!
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// Radial glow that fades to the same hue (fading to transparent black leaves a dark fringe).
function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
}

function vgrad(ctx: Ctx, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, S)
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
}

function vignette(ctx: Ctx, a: number) {
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
}

type TextOpts = {
  align?: CanvasTextAlign
  spacing?: number
  stretch?: CanvasFontStretch
  fit?: number
  glow?: [string, number]
  baseline?: CanvasTextBaseline
}
// Draws text; `fit` shrinks the font until the line is at most that many pixels wide.
export function text(ctx: Ctx, str: string, x: number, y: number, font: string, color: string, o: TextOpts = {}) {
  ctx.save()
  ctx.font = font
  ctx.fontStretch = o.stretch ?? 'normal'
  ctx.letterSpacing = `${o.spacing ?? 0}px`
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.baseline ?? 'alphabetic'
  if (o.fit) {
    const w = ctx.measureText(str).width
    if (w > o.fit) {
      const size = parseFloat(font.match(/(\d+(\.\d+)?)px/)![1])
      ctx.font = font.replace(/\d+(\.\d+)?px/, `${(size * o.fit) / w}px`)
      ctx.fontStretch = o.stretch ?? 'normal' // setting font resets the stretch
    }
  }
  if (o.glow) {
    ctx.shadowColor = o.glow[0]
    ctx.shadowBlur = o.glow[1]
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}

type Design = { bg: (c: Ctx) => void; fg: (c: Ctx) => void; grain: number }

// Parody of the advisory sticker every one of these sleeves carries.
function advisory(c: Ctx, x: number, y: number, w: number, [top, mid, bottom]: [string, string, string]) {
  const h = w * 0.62
  c.fillStyle = '#000'
  c.fillRect(x, y, w, h)
  c.strokeStyle = '#fff'
  c.lineWidth = w * 0.025
  c.strokeRect(x + w * 0.05, y + w * 0.05, w - w * 0.1, h - w * 0.1)
  text(c, top, x + w / 2, y + h * 0.3, `700 ${w * 0.12}px Archivo`, '#fff', { align: 'center', stretch: 'condensed', fit: w * 0.78 })
  c.fillStyle = '#fff'
  c.fillRect(x + w * 0.1, y + h * 0.37, w - w * 0.2, h * 0.3)
  text(c, mid, x + w / 2, y + h * 0.62, `900 ${w * 0.2}px Archivo`, '#000', { align: 'center', stretch: 'condensed', fit: w * 0.76 })
  text(c, bottom, x + w / 2, y + h * 0.85, `700 ${w * 0.09}px Archivo`, '#fff', { align: 'center', stretch: 'condensed', fit: w * 0.78 })
}

// Two-tone print: draw shapes, soften them, add noise, then cut hard at 50% so every edge comes out rough, like a
// stencil or a photocopy.
function stencil(draw: (c: Ctx) => void, seed: number, soften = 2.5) {
  const ink = makeCanvas()
  draw(ctx2d(ink))
  const t = makeCanvas()
  const tc = ctx2d(t)
  tc.filter = `blur(${soften}px)` // once over the whole drawing: far cheaper than blurring each mark
  tc.drawImage(ink, 0, 0)
  tc.filter = 'none'
  const img = tc.getImageData(0, 0, S, S)
  const d = img.data
  const r = seeded(seed)
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] + (r() - 0.5) * 110 > 128 ? 255 : 0
  tc.putImageData(img, 0, 0)
  return t
}

// The originals are 640px squares; positions below are read off them in those units.
const u = S / 640

function clipRect(c: Ctx, [x, y, w, h]: number[], draw: () => void) {
  c.save()
  c.beginPath()
  c.rect(x * u, y * u, w * u, h * u)
  c.clip()
  draw()
  c.restore()
}

// Re-prints part of the canvas through a CSS filter: how the photos get their contrast, softness or fade.
function develop(c: Ctx, [x, y, w, h]: number[], filter: string) {
  const shot = makeCanvas(w * u, h * u)
  ctx2d(shot).drawImage(c.canvas, x * u, y * u, w * u, h * u, 0, 0, w * u, h * u)
  c.save()
  c.filter = filter
  c.drawImage(shot, x * u, y * u)
  c.restore()
}

// A balloon lit from above: a shaded body and a soft highlight; the dark ones carry flecks of dust in the flash.
function balloon(c: Ctx, x: number, y: number, rx: number, ry: number, base: string, r: () => number, dark = false) {
  ;[x, y, rx, ry] = [x * u, y * u, rx * u, ry * u]
  const body = c.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.05, x, y, Math.max(rx, ry) * 1.05)
  body.addColorStop(0, dark ? '#5a5a5a' : '#ffffff')
  body.addColorStop(dark ? 0.35 : 0.5, base)
  body.addColorStop(1, dark ? '#050505' : 'rgba(0,0,0,0.55)')
  c.fillStyle = base
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = body
  c.fill()
  const hl = c.createRadialGradient(x - rx * 0.4, y - ry * 0.45, 0, x - rx * 0.4, y - ry * 0.45, rx * 0.4)
  hl.addColorStop(0, `rgba(255,255,255,${dark ? 0.55 : 0.85})`)
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = hl
  c.fill()
  if (!dark) return
  c.fillStyle = 'rgba(255,255,255,0.8)'
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.8
    c.fillRect(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, (1 + r() * 2) * u, (1 + r() * 2) * u)
  }
}

// A laptop seen from the front, screen content drawn by the caller in screen coordinates.
function laptop(c: Ctx, x: number, y: number, w: number, screen: (sx: number, sy: number, sw: number, sh: number) => void) {
  const h = w * 0.62
  c.fillStyle = '#1c1c1c'
  c.fillRect(x * u, y * u, w * u, h * u)
  const [sx, sy, sw, sh] = [x + w * 0.05, y + w * 0.05, w * 0.9, h - w * 0.1]
  c.save()
  c.beginPath()
  c.rect(sx * u, sy * u, sw * u, sh * u)
  c.clip()
  screen(sx, sy, sw, sh)
  c.restore()
  c.fillStyle = '#2a2a2a'
  c.beginPath()
  c.moveTo((x - w * 0.08) * u, (y + h + w * 0.07) * u)
  c.lineTo((x + w * 1.08) * u, (y + h + w * 0.07) * u)
  c.lineTo((x + w) * u, (y + h) * u)
  c.lineTo(x * u, (y + h) * u)
  c.fill()
}

// The Weeknd's Trilogy sleeves (House of Balloons, Thursday, Echoes of Silence) share one printed layout: the name in
// heavy grotesque, a strip of swatches beside the title, a tracklist set edge to edge, the photo, and a swatch and
// caption in the bottom corner. The photo is painted by each sleeve.
type Trilogy = { title: string; swatches: string[]; tracks: string[]; caption: string }
const INK = '#232323'

function trilogyPaper(c: Ctx, r: () => number) {
  c.fillStyle = '#f1f0ec'
  c.fillRect(0, 0, S, S)
  for (let i = 0; i < 9; i++) {
    const [gx, gy, gr] = [r() * S, r() * S, (60 + r() * 160) * u]
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, gr)
    g.addColorStop(0, 'rgba(120,120,115,0.07)')
    g.addColorStop(1, 'rgba(120,120,115,0)')
    c.fillStyle = g
    c.fillRect(0, 0, S, S)
  }
  c.fillStyle = INK
  for (const [mx, my] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const ox = mx ? S - 7 * u : 7 * u
    const oy = my ? S - 7 * u : 7 * u
    c.fillRect(mx ? ox - 8 * u : ox, oy, 8 * u, 1.1 * u)
    c.fillRect(ox, my ? oy - 8 * u : oy, 1.1 * u, 8 * u)
  }
}

function trilogyType(c: Ctx, t: Trilogy) {
  text(c, 'MalharUdmale', 18 * u, 88 * u, `800 ${76 * u}px Archivo`, INK, { spacing: -2.6 * u, fit: 600 * u })
  c.fillStyle = INK
  c.fillRect(20 * u, 96 * u, 600 * u, 1.1 * u)
  const sw = 226 / t.swatches.length
  t.swatches.forEach((col, i) => {
    c.fillStyle = col
    c.fillRect((20 + i * sw) * u, 102 * u, sw * u + 0.5, 28 * u)
  })
  text(c, t.title, 253 * u, 130 * u, `800 ${37 * u}px Archivo`, INK, { spacing: -1.2 * u, fit: 365 * u })
  c.fillStyle = INK
  c.fillRect(20 * u, 135 * u, 600 * u, 1.1 * u)
  t.tracks.forEach((line, i) => {
    c.save()
    c.font = `700 ${15 * u}px Archivo`
    c.fontStretch = 'condensed'
    const spare = 598 * u - c.measureText(line).width
    c.restore()
    // canvas adds the spacing after every letter, the last one too
    text(c, line, 20 * u, (148 + i * 16) * u, `700 ${15 * u}px Archivo`, INK, {
      stretch: 'condensed',
      spacing: Math.max(0, spare / line.length),
      fit: spare < 0 ? 598 * u : undefined,
    })
  })
  t.swatches.forEach((col, i) => {
    c.fillStyle = col
    c.fillRect((566 + (i * 50) / t.swatches.length) * u, 600 * u, (50 / t.swatches.length) * u + 0.5, 4 * u)
  })
  text(c, t.caption, 616 * u, 615 * u, `600 ${6.5 * u}px Archivo`, INK, { align: 'right' })
}

const designs: Record<CoverId, Design> = {
  // IT'S BEEN AWFUL: no title, just a vast wall of wooden slats under one warm spotlight, a red floor, and one small
  // figure on a chair at the bottom right. Here the figure is a laptop left open on the chair, still running.
  awful: {
    grain: 0.14,
    bg(c) {
      vgrad(c, [
        [0, '#120403'],
        [0.35, '#4a160b'],
        [0.85, '#5c1c0e'],
      ])
      const r = seeded(9)
      for (let x = 0; x < 640; x += 15.5) {
        c.fillStyle = `rgba(${150 + r() * 60},${60 + r() * 25},${30 + r() * 15},${0.12 + r() * 0.12})`
        c.fillRect(x * u, 0, 13 * u, 545 * u)
        c.fillStyle = 'rgba(20,5,2,0.8)'
        c.fillRect((x + 13) * u, 0, 2.5 * u, 545 * u)
      }
      // the spotlight, then everything outside it falling away into the dark
      c.save()
      c.globalCompositeOperation = 'screen'
      glow(c, 400 * u, 330 * u, 270 * u, '255,125,55', 0.8)
      c.restore()
      const dark = c.createRadialGradient(400 * u, 330 * u, 110 * u, 400 * u, 330 * u, 560 * u)
      dark.addColorStop(0, 'rgba(8,2,1,0)')
      dark.addColorStop(1, 'rgba(8,2,1,0.92)')
      c.fillStyle = dark
      c.fillRect(0, 0, S, 545 * u)
      const top = c.createLinearGradient(0, 0, 0, 260 * u)
      top.addColorStop(0, 'rgba(6,1,0,0.95)')
      top.addColorStop(1, 'rgba(6,1,0,0)')
      c.fillStyle = top
      c.fillRect(0, 0, S, 260 * u)
      // red floor, with the wall's foot in shadow
      const floor = c.createLinearGradient(0, 545 * u, 0, S)
      floor.addColorStop(0, '#a81e12')
      floor.addColorStop(0.4, '#d6351c')
      floor.addColorStop(1, '#c42a17')
      c.fillStyle = floor
      c.fillRect(0, 545 * u, S, S - 545 * u)
      c.fillStyle = 'rgba(0,0,0,0.55)'
      c.fillRect(0, 540 * u, S, 9 * u)
      c.save()
      c.globalCompositeOperation = 'screen'
      glow(c, 430 * u, 575 * u, 220 * u, '255,95,40', 0.35)
      c.restore()
    },
    fg(c) {
      // shadow under the chair
      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.beginPath()
      c.ellipse(472 * u, 567 * u, 42 * u, 6 * u, 0, 0, Math.PI * 2)
      c.fill()
      // folding chair
      c.strokeStyle = '#0d0d0d'
      c.lineWidth = 2.4 * u
      c.beginPath()
      for (const [a, b, d, e] of [
        [446, 534, 500, 566],
        [500, 534, 446, 566],
        [452, 470, 452, 534],
        [494, 470, 494, 534],
      ]) {
        c.moveTo(a * u, b * u)
        c.lineTo(d * u, e * u)
      }
      c.stroke()
      c.fillStyle = '#1b1715'
      c.fillRect(449 * u, 470 * u, 48 * u, 18 * u)
      c.beginPath()
      c.moveTo(440 * u, 526 * u)
      c.lineTo(502 * u, 526 * u)
      c.lineTo(508 * u, 536 * u)
      c.lineTo(444 * u, 536 * u)
      c.fill()
      // the laptop on the seat, its screen the only cold light in the room
      c.save()
      c.globalCompositeOperation = 'screen'
      glow(c, 472 * u, 505 * u, 38 * u, '150,255,200', 0.3)
      c.restore()
      laptop(c, 455, 498, 34, (sx, sy, sw, sh) => {
        c.fillStyle = '#06110b'
        c.fillRect(sx * u, sy * u, sw * u, sh * u)
        const r = seeded(4)
        for (let i = 0; i < 7; i++) {
          const up = r() > 0.45
          c.fillStyle = up ? '#4ff09a' : '#ff4f6d'
          c.fillRect((sx + 2 + i * 4.3) * u, (sy + 4 + r() * 8) * u, 2.4 * u, (3 + r() * 6) * u)
        }
      })
    },
  },

  // Starboy: a crimson ground, the title in huge distressed yellow, and the subject slumped in a black leather
  // armchair lit by blue neon, a cross on a chain. Here the chair holds a camera from the equipment desk, and the
  // pendant is an equipment tag with its barcode. In the album window the red ground is a live ShaderGradient.
  starboy: {
    grain: 0.12,
    bg(c) {
      vgrad(c, [
        [0, '#f13a4c'],
        [0.45, '#dc142f'],
        [1, '#b40b25'],
      ])
      glow(c, 120 * u, 140 * u, 420 * u, '255,90,110', 0.35)
      const r = seeded(17)
      for (let i = 0; i < 2600; i++) {
        c.fillStyle = r() > 0.5 ? 'rgba(60,0,10,0.35)' : 'rgba(255,190,200,0.25)'
        c.fillRect(r() * S, r() * S, (0.6 + r() * 1.8) * u, (0.6 + r() * 1.8) * u)
      }
      vignette(c, 0.35)
    },
    fg(c) {
      const BLUE = '#2f5bff'
      // the chair: a tall back and two rolled arms, black leather catching the blue light on its top edges
      c.fillStyle = '#04050b'
      c.beginPath()
      c.moveTo(118 * u, S)
      c.lineTo(118 * u, 265 * u)
      c.bezierCurveTo(118 * u, 205 * u, 170 * u, 185 * u, 320 * u, 185 * u)
      c.bezierCurveTo(470 * u, 185 * u, 522 * u, 205 * u, 522 * u, 265 * u)
      c.lineTo(522 * u, S)
      c.fill()
      c.save()
      c.shadowColor = BLUE
      c.shadowBlur = 26 * u
      c.strokeStyle = 'rgba(70,115,255,0.85)'
      c.lineWidth = 5 * u
      c.beginPath()
      c.moveTo(122 * u, 330 * u)
      c.lineTo(122 * u, 265 * u)
      c.bezierCurveTo(122 * u, 210 * u, 172 * u, 190 * u, 320 * u, 190 * u)
      c.bezierCurveTo(468 * u, 190 * u, 518 * u, 210 * u, 518 * u, 265 * u)
      c.lineTo(518 * u, 330 * u)
      c.stroke()
      c.restore()
      for (const x of [20, 470]) {
        c.fillStyle = '#05060d'
        c.beginPath()
        c.roundRect(x * u, 430 * u, 150 * u, 260 * u, 60 * u)
        c.fill()
        const sheen = c.createLinearGradient(0, 430 * u, 0, 520 * u)
        sheen.addColorStop(0, 'rgba(60,100,255,0.4)')
        sheen.addColorStop(1, 'rgba(60,100,255,0)')
        c.fillStyle = sheen
        c.fill()
      }
      // the camera sitting in the chair
      c.fillStyle = '#0a0d1a'
      c.beginPath()
      c.roundRect(215 * u, 330 * u, 210 * u, 128 * u, 14 * u)
      c.fill()
      c.beginPath()
      c.moveTo(282 * u, 332 * u)
      c.lineTo(298 * u, 288 * u)
      c.lineTo(342 * u, 288 * u)
      c.lineTo(358 * u, 332 * u)
      c.fill()
      c.fillRect(378 * u, 314 * u, 22 * u, 18 * u)
      c.save()
      c.shadowColor = BLUE
      c.shadowBlur = 16 * u
      c.strokeStyle = 'rgba(80,130,255,0.9)'
      c.lineWidth = 3 * u
      c.beginPath()
      c.moveTo(218 * u, 420 * u)
      c.lineTo(218 * u, 344 * u)
      c.quadraticCurveTo(218 * u, 332 * u, 232 * u, 332 * u)
      c.lineTo(282 * u, 332 * u)
      c.lineTo(298 * u, 290 * u)
      c.lineTo(342 * u, 290 * u)
      c.stroke()
      c.restore()
      for (const [rad, col] of [
        [72, '#03040a'],
        [58, '#0b1024'],
        [42, '#050814'],
      ] as const) {
        c.fillStyle = col
        c.beginPath()
        c.arc(320 * u, 402 * u, rad * u, 0, Math.PI * 2)
        c.fill()
      }
      c.strokeStyle = 'rgba(80,130,255,0.75)'
      c.lineWidth = 2.5 * u
      c.beginPath()
      c.arc(320 * u, 402 * u, 72 * u, Math.PI * 0.9, Math.PI * 1.75)
      c.stroke()
      const glass = c.createRadialGradient(305 * u, 388 * u, 2 * u, 320 * u, 402 * u, 42 * u)
      glass.addColorStop(0, '#9fb6ff')
      glass.addColorStop(0.25, '#2a49ff')
      glass.addColorStop(1, '#03050f')
      c.fillStyle = glass
      c.beginPath()
      c.arc(320 * u, 402 * u, 36 * u, 0, Math.PI * 2)
      c.fill()
      // the equipment tag on a chain, where the cross hangs
      c.strokeStyle = '#4f8dff'
      c.lineWidth = 1.6 * u
      c.beginPath()
      c.moveTo(282 * u, 458 * u)
      c.lineTo(320 * u, 492 * u)
      c.lineTo(358 * u, 458 * u)
      c.stroke()
      c.save()
      c.shadowColor = BLUE
      c.shadowBlur = 14 * u
      c.lineWidth = 3 * u
      c.strokeRect(300 * u, 492 * u, 40 * u, 58 * u)
      c.restore()
      const r = seeded(8)
      c.fillStyle = '#4f8dff'
      for (let x = 305; x < 335; x += 2.6) if (r() > 0.35) c.fillRect(x * u, 500 * u, (0.8 + r() * 1.4) * u, 34 * u)
      text(c, 'SAC-0142', 320 * u, 545 * u, `700 ${6 * u}px "Courier Prime"`, '#4f8dff', { align: 'center' })

      // the title, printed and worn
      const t = makeCanvas()
      const tc = ctx2d(t)
      text(tc, 'SACBOY', S / 2, 103 * u, `900 ${132 * u}px Archivo`, '#f2d31b', { align: 'center', stretch: 'semi-expanded', spacing: -2 * u, fit: 610 * u })
      tc.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 900; i++) {
        tc.globalAlpha = 0.3 + r() * 0.7
        tc.fillRect(r() * S, r() * 120 * u, (0.6 + r() * 2.4) * u, (0.6 + r() * 2) * u)
      }
      c.drawImage(t, 0, 0)
      advisory(c, 566 * u, 590 * u, 62 * u, ['EQUIPMENT', 'ADVISORY', 'RETURN ON TIME'])
    },
  },

  // Little Dark Age: flat yellow, the band name in a wavy psychedelic blackletter, a photocopied pen-and-stipple
  // drawing in a tall frame (a crying clown in a haunted room), and L D A stacked down the right. Here the name is
  // REFUSAL and the letters spell ICML, where the paper appeared; the clown is a chat model with its mouth zipped shut,
  // hands up, refusing, and the painting on the wall is the refusal direction.
  darkage: {
    grain: 0.1,
    bg(c) {
      c.fillStyle = '#f4d64e'
      c.fillRect(0, 0, S, S)
      glow(c, S / 2, S / 2, S * 0.7, '255,236,140', 0.25)
    },
    fg(c) {
      const r = seeded(29)
      const ink = stencil(x => {
        x.fillStyle = '#000'
        x.strokeStyle = '#000'
        x.lineCap = 'round'
        x.lineJoin = 'round'
        const line = (w: number, pts: number[]) => {
          x.lineWidth = w * u
          x.beginPath()
          for (let i = 0; i < pts.length; i += 2) x.lineTo((pts[i] + (r() - 0.5) * 2) * u, (pts[i + 1] + (r() - 0.5) * 2) * u)
          x.stroke()
        }
        // stipple inside a shape: dots densest where `dense` says
        const stipple = (shape: () => void, n: number, dense: (px: number, py: number) => number) => {
          x.save()
          shape()
          x.clip()
          for (let i = 0; i < n; i++) {
            const [px, py] = [155 + r() * 385, 108 + r() * 470]
            if (r() > dense(px, py)) continue
            x.beginPath()
            x.arc(px * u, py * u, (1 + r() * 1.4) * u, 0, Math.PI * 2)
            x.fill()
          }
          x.restore()
        }
        const room = () => {
          x.beginPath()
          x.rect(158 * u, 111 * u, 380 * u, 464 * u)
        }
        line(6, [156, 109, 540, 109, 540, 577, 156, 577, 156, 109])
        // the haunted room: dark walls and floor, the light falling off towards the edges
        stipple(room, 16000, (px, py) => 0.05 + 0.5 * Math.min(1, Math.abs(px - 400) / 230) ** 2 + (py > 535 ? 0.4 : 0))
        // dripping arches on the left
        for (const [ax, aw] of [
          [168, 44],
          [218, 42],
          [266, 38],
        ]) {
          line(4, [ax, 330, ax, 175, ax + aw / 2, 150, ax + aw, 175, ax + aw, 330])
          for (let d = 0; d < 3; d++) {
            const dx = ax + 6 + r() * (aw - 12)
            line(3, [dx, 330, dx, 345 + r() * 40])
          }
        }
        line(5, [160, 125, 300, 200])
        line(5, [160, 145, 300, 220])
        // the painting on the wall: an arrow, the direction the model refuses along
        x.save()
        x.fillStyle = '#f4d64e'
        x.fillRect(345 * u, 168 * u, 166 * u, 130 * u)
        x.restore()
        line(6, [345, 168, 511, 172, 507, 298, 349, 294, 345, 168])
        line(3, [360, 182, 496, 185, 493, 284, 363, 281, 360, 182])
        line(7, [380, 265, 470, 200])
        line(7, [440, 198, 472, 199, 468, 230])
        x.beginPath()
        x.arc(522 * u, 140 * u, 6 * u, 0, Math.PI * 2)
        x.stroke()
        // the model: a round screen-head with crying eyes and a zipped mouth, hands up
        x.save()
        x.fillStyle = '#f4d64e'
        x.beginPath()
        x.roundRect(342 * u, 322 * u, 116 * u, 110 * u, 26 * u)
        x.fill()
        x.restore()
        x.lineWidth = 5 * u
        x.beginPath()
        x.roundRect(342 * u, 322 * u, 116 * u, 110 * u, 26 * u)
        x.stroke()
        line(3, [400, 322, 400, 300])
        x.beginPath()
        x.arc(400 * u, 295 * u, 6 * u, 0, Math.PI * 2)
        x.fill()
        for (const ex of [374, 426]) {
          x.lineWidth = 4 * u
          x.beginPath()
          x.arc(ex * u, 362 * u, 11 * u, 0.15 * Math.PI, 0.85 * Math.PI)
          x.stroke()
          line(2.5, [ex - 2, 378, ex - 4, 392])
        }
        line(4, [378, 408, 422, 408])
        for (let zx = 381; zx < 422; zx += 6) line(2.5, [zx, 402, zx, 414])
        for (const [hx, dir] of [
          [318, 1],
          [482, -1],
        ]) {
          x.lineWidth = 5 * u
          x.beginPath()
          x.roundRect((hx - 18) * u, 392 * u, 36 * u, 58 * u, 14 * u)
          x.stroke()
          for (let f = 0; f < 3; f++) line(2.5, [hx - 9 + f * 9, 396, hx - 9 + f * 9, 412])
          line(3, [hx + dir * 4, 450, hx + dir * 30, 540])
        }
        line(4, [372, 432, 352, 575])
        line(4, [428, 432, 448, 575])
        stipple(
          () => {
            x.beginPath()
            x.moveTo(372 * u, 434 * u)
            x.lineTo(428 * u, 434 * u)
            x.lineTo(448 * u, 575 * u)
            x.lineTo(352 * u, 575 * u)
          },
          9000,
          () => 0.5,
        )
      }, 31, 1.2)
      c.drawImage(ink, 0, 0)
      text(c, 'REFUSAL', 30 * u, 70 * u, `${60 * u}px Fruktur`, '#1d140a', { fit: 300 * u })
      ;['I', 'C', 'M', 'L'].forEach((ch, i) => text(c, ch, 582 * u, (205 + i * 100) * u, `${56 * u}px Fruktur`, '#1d140a', { align: 'center' }))
    },
  },

  // Alone at Prom: a dim school hall in warm amber light, a bunch of peach balloons and a hand-lettered PROM sign by
  // the stage, the singer at the mic, and a crowd of heads in the foreground, the right side smeared by movement.
  // Here the stage holds a lectern and a laptop for a conference talk, and the sign reads CVIP. In the album window
  // the haze is live Vanta fog.
  prom: {
    grain: 0.16,
    bg(c) {
      c.fillStyle = '#150805'
      c.fillRect(0, 0, S, S)
      const r = seeded(13)
      for (let x = 0; x < 640; x += 22) {
        const g = c.createLinearGradient(x * u, 0, (x + 22) * u, 0)
        g.addColorStop(0, 'rgba(40,10,6,0.9)')
        g.addColorStop(0.5, `rgba(${90 + r() * 30},28,14,0.9)`)
        g.addColorStop(1, 'rgba(40,10,6,0.9)')
        c.fillStyle = g
        c.fillRect(x * u, 0, 22 * u, 330 * u)
      }
      c.save()
      c.globalCompositeOperation = 'screen'
      glow(c, 30 * u, 170 * u, 300 * u, '255,150,50', 0.9)
      glow(c, 300 * u, 260 * u, 420 * u, '255,140,60', 0.18)
      c.restore()
      vignette(c, 0.45)
    },
    fg(c) {
      const r = seeded(21)
      // balloons by the stage, and their ribbons
      c.strokeStyle = 'rgba(255,215,190,0.55)'
      c.lineWidth = 1 * u
      for (let i = 0; i < 9; i++) {
        c.beginPath()
        c.moveTo((175 + r() * 50) * u, (175 + r() * 60) * u)
        c.quadraticCurveTo((185 + r() * 20) * u, 260 * u, 188 * u, 305 * u)
        c.stroke()
      }
      const peach = ['#f4b8a2', '#f7cdb9', '#ea9580', '#f3d5c6', '#f0a48c']
      for (let i = 0; i < 15; i++) {
        const a = r() * Math.PI * 2
        const d = r() * 52
        balloon(c, 195 + Math.cos(a) * d * 0.9, 182 + Math.sin(a) * d * 1.15, 17 + r() * 7, 19 + r() * 8, peach[i % peach.length], r)
      }
      balloon(c, 172, 140, 27, 30, '#f7b5b0', r)
      // the sign
      c.save()
      c.translate(132 * u, 252 * u)
      c.rotate(-0.22)
      c.fillStyle = '#e8d6bf'
      c.fillRect(-32 * u, -36 * u, 64 * u, 72 * u)
      c.strokeStyle = '#6b4a2e'
      c.lineWidth = 2 * u
      c.strokeRect(-32 * u, -36 * u, 64 * u, 72 * u)
      text(c, 'CVIP', 0, -2 * u, `${24 * u}px Yellowtail`, '#2a1a10', { align: 'center' })
      text(c, '2026', 0, 20 * u, `${15 * u}px Yellowtail`, '#2a1a10', { align: 'center' })
      c.restore()
      // the lectern and the laptop on it, where the singer stands
      c.save()
      c.globalCompositeOperation = 'screen'
      glow(c, 268 * u, 205 * u, 40 * u, '200,220,255', 0.45)
      c.restore()
      c.fillStyle = '#2a1209'
      c.beginPath()
      c.moveTo(244 * u, 218 * u)
      c.lineTo(296 * u, 218 * u)
      c.lineTo(290 * u, 305 * u)
      c.lineTo(250 * u, 305 * u)
      c.fill()
      c.strokeStyle = 'rgba(255,170,90,0.7)'
      c.lineWidth = 2 * u
      c.beginPath()
      c.moveTo(244 * u, 218 * u)
      c.lineTo(250 * u, 305 * u)
      c.stroke()
      c.fillStyle = '#dfe8ff'
      c.fillRect(255 * u, 200 * u, 28 * u, 17 * u)
      c.strokeStyle = '#1a0c06'
      c.lineWidth = 1.5 * u
      c.beginPath()
      c.moveTo(290 * u, 218 * u)
      c.quadraticCurveTo(300 * u, 200 * u, 292 * u, 192 * u)
      c.stroke()
      // the crowd: heads and shoulders, rim-lit from the left, softer the nearer they are
      for (const [blur, rows] of [
        [2, 10],
        [5, 7],
        [9, 5],
      ] as const) {
        c.save()
        c.filter = `blur(${blur * u}px)`
        for (let i = 0; i < rows; i++) {
          const near = blur / 9
          const x = r() * 640
          const y = 300 + near * 220 + r() * 90
          const s = 0.7 + near * 1.6 + r() * 0.4
          c.fillStyle = '#0c0503'
          c.beginPath()
          c.ellipse(x * u, (y + 52 * s) * u, 44 * s * u, 40 * s * u, 0, 0, Math.PI * 2)
          c.moveTo((x + 20 * s) * u, y * u) // a separate shape, not joined to the shoulders by a line
          c.ellipse(x * u, y * u, 20 * s * u, 25 * s * u, 0, 0, Math.PI * 2)
          c.fill()
          c.strokeStyle = 'rgba(255,150,60,0.5)'
          c.lineWidth = 2.5 * u
          c.beginPath()
          c.arc(x * u, y * u, 21 * s * u, Math.PI * 0.75, Math.PI * 1.35)
          c.stroke()
        }
        c.restore()
      }
      // dancers on the right, too fast for the shutter
      c.save()
      c.filter = `blur(${12 * u}px)`
      for (const [x, y, w, h, col] of [
        [575, 130, 50, 170, 'rgba(235,170,150,0.3)'],
        [615, 300, 40, 220, 'rgba(200,60,70,0.35)'],
        [530, 350, 45, 150, 'rgba(225,200,180,0.22)'],
      ] as const) {
        c.fillStyle = col
        c.beginPath()
        c.ellipse(x * u, y * u, w * u, h * u, -0.25, 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
      advisory(c, 293 * u, 600 * u, 54 * u, ['FEDERATED', 'ADVISORY', 'NO DATA SHARED'])
    },
  },

  // House of Balloons: the Trilogy layout over a grainy black-and-white photo of black and white balloons heaped in a
  // tiled bathtub corner (the woman among them is left out). The win here was at Adobe, so the house is Adobe's.
  balloons: {
    grain: 0.08,
    bg(c) {
      trilogyPaper(c, seeded(31))
    },
    fg(c) {
      trilogyType(c, {
        title: 'HouseOfAdobe',
        swatches: [...Array(8)].map((_, i) => {
          const v = Math.round(222 - (i / 7) * 205)
          return `rgb(${v},${v},${v})`
        }),
        tracks: ['1 ADOBE UNIVERSITY HACKATHON 2026 2 TOP 8 OF 1 LAKH+ TEAMS 3 WEBSITE SEVERITIES', '4 FLAGGED FOR AI DISCOVERABILITY 5 MALHAR UDMALE 6 IIIT ALLAHABAD 7 HOUSE OF ADOBE'],
        caption: 'House Of Adobe',
      })
      const photo = [22, 186, 596, 397]
      const r = seeded(5)
      clipRect(c, photo, () => {
        c.fillStyle = '#f5f5f5'
        c.fillRect(22 * u, 186 * u, 596 * u, 397 * u)
        // two walls meet in the corner of the tub, their tiles at different angles
        const wall = (pts: number[], angle: number, size: number) => {
          c.save()
          c.beginPath()
          for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i] * u, pts[i + 1] * u)
          c.clip()
          c.translate(320 * u, 384 * u)
          c.rotate(angle)
          c.strokeStyle = 'rgba(95,95,95,0.6)'
          c.lineWidth = 1.2 * u
          for (let t = -600; t <= 600; t += size) {
            c.beginPath()
            c.moveTo(t * u, -600 * u)
            c.lineTo(t * u, 600 * u)
            c.moveTo(-600 * u, t * u)
            c.lineTo(600 * u, t * u)
            c.stroke()
          }
          c.restore()
        }
        wall([22, 186, 352, 186, 470, 583, 22, 583], 0.62, 44)
        wall([352, 186, 618, 186, 618, 583, 470, 583], -0.38, 48)
        const light = c.createLinearGradient(618 * u, 186 * u, 22 * u, 583 * u)
        light.addColorStop(0, 'rgba(0,0,0,0)')
        light.addColorStop(0.55, 'rgba(0,0,0,0.12)')
        light.addColorStop(1, 'rgba(0,0,0,0.5)')
        c.fillStyle = light
        c.fillRect(0, 0, S, S)
        glow(c, 560 * u, 210 * u, 300 * u, '255,255,255', 0.6)
        // back to front, positions read off the original
        for (const [x, y, rx, ry, dark] of [
          [92, 226, 88, 70, 0],
          [228, 210, 60, 46, 1],
          [300, 272, 48, 50, 0],
          [86, 376, 74, 80, 1],
          [482, 470, 66, 70, 0],
          [252, 362, 56, 60, 0],
          [198, 408, 38, 46, 0],
          [602, 505, 62, 82, 1],
          [290, 456, 42, 46, 1],
          [72, 550, 56, 46, 1],
          [190, 522, 58, 62, 1],
          [416, 542, 70, 58, 0],
          [302, 548, 56, 54, 1],
          [338, 512, 30, 26, 0],
          [374, 420, 46, 48, 0],
        ])
          balloon(c, x, y, rx, ry, dark ? '#1c1c1c' : '#e4e4e4', r, !!dark)
        c.strokeStyle = 'rgba(245,245,245,0.85)'
        c.lineWidth = 1.4 * u
        for (const [ax, ay, bx, by, ex, ey] of [
          [140, 583, 190, 560, 300, 572],
          [230, 583, 260, 566, 350, 575],
          [120, 470, 150, 500, 135, 540],
        ]) {
          c.beginPath()
          c.moveTo(ax * u, ay * u)
          c.quadraticCurveTo(bx * u, by * u, ex * u, ey * u)
          c.stroke()
        }
        glow(c, 318 * u, 446 * u, 26 * u, '255,255,255', 0.95)
        vignette(c, 0.35)
      })
      develop(c, photo, 'contrast(1.35) brightness(1.04) blur(0.8px)')
      clipRect(c, photo, () => grain(c, 0.3))
    },
  },

  // Thursday: the Trilogy layout with a strip of warm colour swatches, and three photos side by side: Wednesday in
  // black and white with the day scrawled across it, Thursday in full flash colour among balloons, Friday faded.
  // Here the three days are the last of the challenge, and Thursday's photo holds the score.
  thursday: {
    grain: 0.08,
    bg(c) {
      trilogyPaper(c, seeded(37))
    },
    fg(c) {
      const swatches = ['#f6d21c', '#f5a11a', '#ef6a1f', '#e6372b', '#df4b55', '#c9706f', '#9a8f8f', '#6fb3d2']
      trilogyType(c, {
        title: 'Deadline',
        swatches,
        tracks: ['1 AMAZON ML CHALLENGE 2026 2 SCORED 95.8% 3 WEDNESDAY 4 THURSDAY 5 FRIDAY', '6 TRAIN 7 VALIDATE 8 SUBMIT 9 THE LEADERBOARD 10 MALHAR UDMALE 11 IIIT ALLAHABAD'],
        caption: 'Deadline',
      })
      const r = seeded(41)
      const desk = (x: number, w: number, screen: (sx: number, sy: number, sw: number, sh: number) => void) => {
        const wall = c.createLinearGradient(0, 196 * u, 0, 561 * u)
        wall.addColorStop(0, '#d9d4cc')
        wall.addColorStop(1, '#8e877d')
        c.fillStyle = wall
        c.fillRect(x * u, 196 * u, w * u, 365 * u)
        c.fillStyle = '#5c4a3a'
        c.fillRect(x * u, 470 * u, w * u, 91 * u)
        laptop(c, x + w * 0.2, 385, w * 0.6, screen)
      }
      // Wednesday: still training, the loss curve noisy
      const wed = [20, 196, 190, 365]
      clipRect(c, wed, () =>
        desk(20, 190, (sx, sy, sw, sh) => {
          c.fillStyle = '#0d0d0d'
          c.fillRect(sx * u, sy * u, sw * u, sh * u)
          c.strokeStyle = '#f0f0f0'
          c.lineWidth = 1.2 * u
          c.beginPath()
          // falling loss, still noisy
          for (let i = 0; i <= 30; i++) c.lineTo((sx + 3 + (i / 30) * (sw - 6)) * u, (sy + 4 + (sh - 8) * (1 - Math.exp(-i / 9)) * 0.9 + (r() - 0.5) * 3) * u)
          c.stroke()
        }),
      )
      develop(c, wed, 'grayscale(1) contrast(1.25)')
      // Thursday: balloons in flash colour, and the score
      clipRect(c, [219, 196, 193, 365], () => {
        c.fillStyle = '#efe7da'
        c.fillRect(219 * u, 196 * u, 193 * u, 365 * u)
        const cols = ['#d8262b', '#1f5fbf', '#f2c41d', '#f4f4f4', '#141414', '#2a9a52', '#e8742a']
        for (let i = 0; i < 16; i++) {
          const col = cols[i % cols.length]
          balloon(c, 219 + r() * 193, 196 + r() * 365, 34 + r() * 22, 38 + r() * 24, col, r, col === '#141414')
        }
        c.save()
        c.translate(315 * u, 385 * u)
        c.rotate(-0.05)
        c.fillStyle = '#fbfaf6'
        c.shadowColor = 'rgba(0,0,0,0.35)'
        c.shadowBlur = 12 * u
        c.fillRect(-62 * u, -46 * u, 124 * u, 92 * u)
        c.shadowBlur = 0
        text(c, '95.8%', 0, 14 * u, `900 ${40 * u}px Archivo`, '#141414', { align: 'center', stretch: 'condensed' })
        text(c, 'AMAZON ML CHALLENGE', 0, 34 * u, `700 ${7.5 * u}px Archivo`, '#141414', { align: 'center' })
        c.restore()
      })
      develop(c, [219, 196, 193, 365], 'saturate(1.35) contrast(1.1)')
      // Friday: it's over; empty cans on the desk, faded like an old print
      const fri = [423, 196, 189, 365]
      clipRect(c, fri, () => {
        desk(423, 189, (sx, sy, sw, sh) => {
          c.fillStyle = '#2b3a4a'
          c.fillRect(sx * u, sy * u, sw * u, sh * u)
          text(c, 'Submitted', (sx + sw / 2) * u, (sy + sh / 2 + 3) * u, `700 ${9 * u}px Archivo`, '#e9eef4', { align: 'center' })
        })
        for (const [x, tilt] of [
          [445, 0],
          [470, 0.1],
          [580, -1.4],
        ]) {
          c.save()
          c.translate(x * u, 500 * u)
          c.rotate(tilt)
          c.fillStyle = '#c9c4bd'
          c.fillRect(-9 * u, -34 * u, 18 * u, 34 * u)
          c.fillStyle = '#7b8c3a'
          c.fillRect(-9 * u, -26 * u, 18 * u, 14 * u)
          c.restore()
        }
      })
      develop(c, fri, 'sepia(0.45) saturate(0.6) contrast(0.8) brightness(1.12)')
      text(c, 'Wednesday', 115 * u, 300 * u, `${44 * u}px Yellowtail`, 'rgba(40,40,40,0.75)', { align: 'center' })
      text(c, 'Friday', 517 * u, 290 * u, `${50 * u}px Yellowtail`, 'rgba(60,55,50,0.7)', { align: 'center' })
      clipRect(c, [20, 196, 592, 365], () => grain(c, 0.22))
      advisory(c, 538 * u, 510 * u, 68 * u, ['MACHINE', 'ADVISORY', 'LEARNED CONTENT'])
    },
  },

  // Echoes of Silence: the Trilogy layout with a strip of dark reds, one tracklist line, and a near-black close-up
  // lit red from the right. Here the close-up is a studio microphone, for a voice agent.
  echoes: {
    grain: 0.08,
    bg(c) {
      trilogyPaper(c, seeded(43))
    },
    fg(c) {
      trilogyType(c, {
        title: 'EchoesOfSpeech',
        swatches: ['#c1121f', '#a50f1a', '#8a0c16', '#6e0a12', '#550a0f', '#3e070b', '#2a0508', '#1a0306'],
        tracks: ['1 SARVAM AI CAMPUS HACKATHON 2 RUNNER-UP 3 A MULTILINGUAL VOICE AGENT 4 FOR BLIND PEOPLE'],
        caption: 'Echoes Of Speech',
      })
      const photo = [22, 170, 596, 418]
      clipRect(c, photo, () => {
        c.fillStyle = '#0b0606'
        c.fillRect(0, 0, S, S)
        glow(c, 560 * u, 300 * u, 280 * u, '190,18,30', 0.75)
        glow(c, 470 * u, 240 * u, 160 * u, '230,40,50', 0.35)
        // the microphone: capsule, mesh, collar, leaning in from the left in shadow
        c.save()
        c.translate(270 * u, 400 * u)
        c.rotate(-0.28)
        const capsule = () => {
          c.beginPath()
          c.roundRect(-95 * u, -175 * u, 190 * u, 300 * u, 95 * u)
        }
        capsule()
        const body = c.createLinearGradient(-95 * u, 0, 95 * u, 0)
        body.addColorStop(0, '#050303')
        body.addColorStop(0.7, '#1a0d0d')
        body.addColorStop(1, '#4a0d12')
        c.fillStyle = body
        c.fill()
        c.save()
        capsule()
        c.clip()
        c.strokeStyle = 'rgba(210,55,60,0.45)'
        c.lineWidth = 1.1 * u
        for (let t = -300; t < 300; t += 9) {
          c.beginPath()
          c.moveTo(t * u, -200 * u)
          c.lineTo((t + 200) * u, 200 * u)
          c.moveTo(t * u, 200 * u)
          c.lineTo((t + 200) * u, -200 * u)
          c.stroke()
        }
        c.fillStyle = '#0d0606'
        c.fillRect(-100 * u, -18 * u, 200 * u, 26 * u)
        c.fillStyle = 'rgba(240,60,70,0.55)'
        c.fillRect(40 * u, -18 * u, 55 * u, 4 * u)
        c.restore()
        c.strokeStyle = 'rgba(255,60,70,0.95)'
        c.lineWidth = 3 * u
        c.beginPath()
        c.roundRect(-95 * u, -175 * u, 190 * u, 300 * u, 95 * u)
        c.save()
        c.clip()
        c.lineWidth = 7 * u
        c.beginPath()
        c.arc(10 * u, -40 * u, 120 * u, -0.9, 0.6)
        c.stroke()
        c.restore()
        c.fillStyle = '#120808'
        c.fillRect(-60 * u, 125 * u, 120 * u, 40 * u)
        c.fillRect(-28 * u, 165 * u, 56 * u, 120 * u)
        c.restore()
        vignette(c, 0.55)
      })
      develop(c, photo, 'blur(1.6px) contrast(1.15)')
      clipRect(c, photo, () => grain(c, 0.3))
      advisory(c, 535 * u, 528 * u, 72 * u, ['VOICE', 'ADVISORY', 'SPOKEN CONTENT'])
    },
  },
}

export type Cover = { full: HTMLCanvasElement; fg: HTMLCanvasElement; url: string; fgUrl: string }

export function paintCovers(): Map<CoverId, Cover> {
  const out = new Map<CoverId, Cover>()
  for (const id of Object.keys(designs) as CoverId[]) {
    const d = designs[id]
    const fg = makeCanvas()
    d.fg(ctx2d(fg))
    const full = makeCanvas()
    const c = ctx2d(full)
    d.bg(c)
    c.drawImage(fg, 0, 0)
    grain(c, d.grain)
    out.set(id, { full, fg, url: full.toDataURL('image/jpeg', 0.9), fgUrl: fg.toDataURL() })
  }
  return out
}

// Blurred, darkened cover sized to the viewport. Used as the record modal backdrop and as the
// image the liquid-glass buttons refract.
export function paintBackdrop(cover: HTMLCanvasElement, w: number, h: number) {
  const out = makeCanvas(w, h)
  const c = ctx2d(out)
  // shrink the art to a few pixels first so only its colours survive, not its detail or grain
  const tiny = makeCanvas(16, 16)
  ctx2d(tiny).drawImage(cover, 0, 0, 16, 16)
  const size = Math.max(w, h) + 400
  c.imageSmoothingQuality = 'high'
  c.filter = 'blur(80px) saturate(1.3) brightness(0.6)'
  c.drawImage(tiny, (w - size) / 2, (h - size) / 2, size, size)
  c.filter = 'none'
  const g = c.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, 'rgba(10,6,4,0.15)')
  g.addColorStop(1, 'rgba(10,6,4,0.55)')
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  return out
}
