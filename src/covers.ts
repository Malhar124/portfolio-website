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

function star(c: Ctx, x: number, y: number, r: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.4 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

// Greyscale flannel check, for the shirt on the LIVE.LOVE sleeve.
function plaid(c: Ctx) {
  const t = makeCanvas(96, 96)
  const p = ctx2d(t)
  p.fillStyle = '#d9d9d9'
  p.fillRect(0, 0, 96, 96)
  for (const [o, w, a] of [
    [0, 30, 0.75],
    [44, 8, 0.6],
    [62, 4, 0.5],
    [80, 3, 0.35],
  ]) {
    p.fillStyle = `rgba(15,15,15,${a})`
    p.fillRect(o, 0, w, 96)
    p.fillRect(0, o, 96, w)
  }
  return c.createPattern(t, 'repeat')!
}

// Two-tone print: draw shapes soft, add noise, then cut hard at 50% so every edge comes out rough, like a stencil.
function stencil(draw: (c: Ctx) => void, seed: number) {
  const t = makeCanvas()
  const tc = ctx2d(t)
  tc.filter = 'blur(2.5px)'
  draw(tc)
  tc.filter = 'none'
  const img = tc.getImageData(0, 0, S, S)
  const d = img.data
  const r = seeded(seed)
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] + (r() - 0.5) * 110 > 128 ? 255 : 0
  tc.putImageData(img, 0, 0)
  return t
}

const designs: Record<CoverId, Design> = {
  // LIVE.LOVE.A$AP: black-and-white flag, a figure in flannel with a pink streak, blackletter title down a black edge.
  // The figure is faceless (redacted), which suits a paper about refusal. The live modal swaps the bg for grey Vanta fog.
  livelove: {
    grain: 0.3,
    bg(c) {
      c.fillStyle = '#111'
      c.fillRect(0, 0, S, S)
      const r = seeded(9)
      c.save()
      c.filter = 'blur(40px)'
      for (let i = 0; i < 9; i++) glow(c, r() * S, r() * S, S * (0.2 + r() * 0.35), '205,205,210', 0.12 + r() * 0.2)
      c.restore()
    },
    fg(c) {
      const band = S * 0.085
      const stripe = S / 11
      for (let i = 0; i < 11; i++) {
        if (i % 2) {
          c.fillStyle = 'rgba(16,16,16,0.62)' // dark stripes let the fog through
        } else {
          const g = c.createLinearGradient(band, 0, S, 0)
          for (let k = 0; k <= 10; k++) {
            const v = Math.round(205 + 35 * Math.sin(k * 1.7 + i * 0.6)) // fabric folds
            g.addColorStop(k / 10, `rgba(${v},${v},${v},0.93)`)
          }
          c.fillStyle = g
        }
        c.fillRect(band, i * stripe, S - band, stripe)
      }
      c.fillStyle = 'rgba(12,12,12,0.92)'
      c.fillRect(band, 0, S * 0.26, S * 0.6)
      c.fillStyle = '#f2f2f2'
      for (const y of [0.09, 0.28, 0.47]) {
        star(c, S * 0.215, S * y, S * 0.058)
        star(c, S * 0.1, S * (y + 0.095), S * 0.04)
      }
      // figure
      const cx = S * 0.54
      c.save()
      c.beginPath()
      c.moveTo(S * 0.12, S)
      c.bezierCurveTo(S * 0.15, S * 0.72, S * 0.3, S * 0.63, cx - S * 0.1, S * 0.6)
      c.lineTo(cx + S * 0.1, S * 0.6)
      c.bezierCurveTo(S * 0.78, S * 0.63, S * 0.93, S * 0.72, S * 0.96, S)
      c.closePath()
      c.fillStyle = plaid(c)
      c.fill()
      c.clip()
      const shade = c.createRadialGradient(cx, S * 0.75, S * 0.1, cx, S * 0.8, S * 0.5)
      shade.addColorStop(0, 'rgba(0,0,0,0)')
      shade.addColorStop(1, 'rgba(0,0,0,0.55)')
      c.fillStyle = shade
      c.fillRect(0, 0, S, S)
      c.strokeStyle = 'rgba(10,10,10,0.8)'
      c.lineWidth = 10
      c.beginPath()
      c.moveTo(cx - S * 0.1, S * 0.6)
      c.lineTo(cx, S * 0.72)
      c.lineTo(cx + S * 0.1, S * 0.6)
      c.stroke()
      c.restore()
      c.fillStyle = '#262626'
      c.fillRect(cx - S * 0.05, S * 0.46, S * 0.1, S * 0.16)
      const head = c.createRadialGradient(cx - S * 0.02, S * 0.36, S * 0.01, cx, S * 0.38, S * 0.12)
      head.addColorStop(0, '#555')
      head.addColorStop(1, '#1d1d1d')
      c.fillStyle = head
      c.beginPath()
      c.ellipse(cx, S * 0.385, S * 0.085, S * 0.11, 0, 0, Math.PI * 2)
      c.fill()
      // checked snapback
      c.save()
      c.beginPath()
      c.ellipse(cx, S * 0.315, S * 0.1, S * 0.08, 0, Math.PI, 0)
      c.lineTo(cx + S * 0.1, S * 0.33)
      c.lineTo(cx - S * 0.1, S * 0.33)
      c.closePath()
      c.fillStyle = '#121212'
      c.fill()
      c.clip()
      c.fillStyle = 'rgba(240,240,240,0.85)'
      for (let y = S * 0.22; y < S * 0.34; y += 12)
        for (let x = cx - S * 0.11 + ((y / 12) % 2) * 6; x < cx + S * 0.11; x += 12) c.fillRect(x, y, 4, 4)
      c.restore()
      c.fillStyle = '#0b0b0b'
      c.fillRect(cx - S * 0.1, S * 0.325, S * 0.2, S * 0.018)
      // the pink streak under the eye
      c.save()
      c.filter = 'blur(2px)'
      c.lineCap = 'round'
      c.strokeStyle = 'rgba(255,92,170,0.85)'
      c.lineWidth = 16
      c.beginPath()
      c.moveTo(cx - S * 0.055, S * 0.43)
      c.lineTo(cx - S * 0.02, S * 0.39)
      c.stroke()
      c.strokeStyle = 'rgba(255,170,215,0.7)'
      c.lineWidth = 5
      c.stroke()
      c.restore()
      // title down the left edge
      c.fillStyle = '#070707'
      c.fillRect(0, 0, band, S)
      const chars = [...'LIVE·LOVE·REFUSE']
      const step = S / chars.length
      chars.forEach((ch, i) => text(c, ch, band / 2, step * (i + 0.8), `${step * 0.9}px UnifrakturMaguntia`, '#f4f4f4', { align: 'center' }))
      advisory(c, S * 0.845, S * 0.895, S * 0.12, ['EPISTEMIC', 'ADVISORY', 'ABLATED CONTENT'])
    },
  },

  // AT.LONG.LAST.A$AP: grainy black-and-white extreme close-up, one pink paint smear, title in a black strip.
  // Here the close-up is the MRI and the pink smear is the tumour mask.
  atlonglast: {
    grain: 0.42,
    bg(c) {
      c.fillStyle = '#0e0e0e'
      c.fillRect(0, 0, S, S)
      c.save()
      c.filter = 'blur(16px)'
      const body = c.createRadialGradient(S * 0.42, S * 0.5, S * 0.05, S * 0.45, S * 0.55, S * 0.7)
      body.addColorStop(0, '#8c8c8c')
      body.addColorStop(0.6, '#3e3e3e')
      body.addColorStop(1, '#101010')
      c.fillStyle = body
      c.fillRect(0, 0, S, S)
      c.fillStyle = '#8e8e8e'
      for (const [x, rot] of [
        [-0.02, 0.4],
        [0.94, -0.4],
      ]) {
        c.beginPath()
        c.ellipse(S * x, S * 0.8, S * 0.13, S * 0.22, rot, 0, Math.PI * 2)
        c.fill()
      }
      const bladder = c.createRadialGradient(S * 0.3, S * 0.27, S * 0.02, S * 0.31, S * 0.29, S * 0.22)
      bladder.addColorStop(0, '#e6e6e6') // urine is bright on T2
      bladder.addColorStop(0.6, '#a8a8a8')
      bladder.addColorStop(1, 'rgba(120,120,120,0)')
      c.fillStyle = bladder
      c.fillRect(0, 0, S, S)
      c.restore()
      // tissue texture: fine curved strands, light and dark
      const r = seeded(19)
      c.save()
      c.filter = 'blur(4px)'
      c.lineCap = 'round'
      for (let i = 0; i < 140; i++) {
        c.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.1})` : `rgba(0,0,0,${r() * 0.18})`
        c.lineWidth = 4 + r() * 16
        const x = r() * S
        const y = r() * S
        const a = r() * Math.PI
        c.beginPath()
        c.moveTo(x, y)
        c.quadraticCurveTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50 + 15, x + Math.cos(a) * 90, y + Math.sin(a) * 90)
        c.stroke()
      }
      c.restore()
      // push the contrast the way the photo does
      const copy = makeCanvas()
      ctx2d(copy).drawImage(c.canvas, 0, 0)
      c.globalCompositeOperation = 'overlay'
      c.drawImage(copy, 0, 0)
      c.globalCompositeOperation = 'source-over'
      vignette(c, 0.55)
    },
    fg(c) {
      // pink paint dragged across the tumour, dry-brush edges
      const r = seeded(23)
      c.save()
      c.translate(S * 0.31, S * 0.25)
      c.rotate(-0.45)
      c.filter = 'blur(3px)'
      for (let i = 0; i < 7; i++) {
        c.fillStyle = `rgba(236,52,112,${0.35 + r() * 0.35})`
        c.beginPath()
        c.ellipse((r() - 0.5) * S * 0.12, (r() - 0.5) * S * 0.06, S * (0.04 + r() * 0.05), S * (0.025 + r() * 0.03), (r() - 0.5) * 0.6, 0, Math.PI * 2)
        c.fill()
      }
      c.filter = 'blur(1px)'
      c.lineCap = 'round'
      for (let i = 0; i < 16; i++) {
        c.strokeStyle = ['rgba(255,110,165,', 'rgba(255,175,205,', 'rgba(205,30,90,'][i % 3] + (0.2 + r() * 0.35) + ')'
        c.lineWidth = 3 + r() * 9
        const y = (r() - 0.5) * S * 0.1
        c.beginPath()
        c.moveTo(-S * (0.06 + r() * 0.06), y)
        c.quadraticCurveTo(0, y + (r() - 0.5) * 30, S * (0.05 + r() * 0.08), y + (r() - 0.5) * 40)
        c.stroke()
      }
      // Chrome blanks the whole canvas if a blur filter is still set while erasing with destination-out
      c.filter = 'none'
      c.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 700; i++) {
        const x = (r() - 0.5) * S * 0.26
        const y = (r() - 0.5) * S * 0.14
        c.globalAlpha = Math.min(1, (Math.abs(x) / (S * 0.13)) ** 2 + r() * 0.3)
        c.fillRect(x, y, 2 + r() * 10, 1 + r() * 2)
      }
      c.restore()
      c.fillStyle = 'rgba(10,10,10,0.85)'
      c.fillRect(S * 0.598, S * 0.07, 4, S * 0.06)
      c.fillRect(S * 0.585, S * 0.088, S * 0.03, 4)
      // medallion: four clinics around one shared model
      const [mx, my, mr] = [S * 0.3, S * 0.83, S * 0.065]
      const coin = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr)
      coin.addColorStop(0, '#f4f4f4')
      coin.addColorStop(0.6, '#9a9a9a')
      coin.addColorStop(1, '#3a3a3a')
      c.fillStyle = coin
      c.beginPath()
      c.arc(mx, my, mr, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = 'rgba(30,30,30,0.7)'
      c.lineWidth = 2
      for (const k of [0.92, 0.7]) {
        c.beginPath()
        c.arc(mx, my, mr * k, 0, Math.PI * 2)
        c.stroke()
      }
      c.fillStyle = '#2a2a2a'
      ;[0, 1, 2, 3, 4].forEach(i => {
        const a = (i * Math.PI) / 2 + Math.PI / 4
        const d = i === 4 ? 0 : mr * 0.45
        c.beginPath()
        c.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, mr * 0.09, 0, Math.PI * 2)
        c.fill()
      })
      text(c, 'CVIP', S * 0.53, S * 0.86, `600 ${S * 0.09}px "Bodoni Moda"`, '#f4f4f4', { align: 'center' })
      text(c, '2026', S * 0.53, S * 0.915, `600 ${S * 0.036}px "Bodoni Moda"`, '#f4f4f4', { align: 'center', spacing: S * 0.006 })
      // title strip down the right edge
      const x0 = S * 0.915
      c.fillStyle = '#0a0a0a'
      c.fillRect(x0, 0, S - x0, S)
      c.save()
      c.translate(x0 + (S - x0) * 0.24, S * 0.04)
      c.rotate(Math.PI / 2)
      c.scale(0.78, 1)
      text(c, 'AT. LONG. LAST. FEDAVG', 0, 0, `600 ${S * 0.058}px "Bodoni Moda"`, '#f2f2f2', { fit: (S * 0.9) / 0.78 })
      c.restore()
    },
  },

  // Kiss Land: black sleeve, small white artist name, mint-green neon title over an inset photo of a teal Tokyo night.
  tickland: {
    grain: 0.12,
    bg(c) {
      c.fillStyle = '#0d0d0d'
      c.fillRect(0, 0, S, S)
      const [ix, iy, iw, ih] = [S * 0.045, S * 0.345, S * 0.91, S * 0.515]
      c.save()
      c.beginPath()
      c.rect(ix, iy, iw, ih)
      c.clip()
      const base = c.createLinearGradient(ix, 0, ix + iw, 0)
      base.addColorStop(0, '#081412')
      base.addColorStop(0.6, '#0f2622')
      base.addColorStop(1, '#2a4a3f')
      c.fillStyle = base
      c.fillRect(ix, iy, iw, ih)
      const r = seeded(3)
      for (let x = ix; x < ix + iw * 0.62; x += 30 + r() * 46) {
        const w = 26 + r() * 40
        const top = iy + ih * (0.08 + r() * 0.45)
        c.fillStyle = 'rgba(6,20,18,0.92)'
        c.fillRect(x, top, w, iy + ih - top)
        for (let wy = top + 8; wy < iy + ih; wy += 10)
          for (let wx = x + 5; wx < x + w - 4; wx += 8) {
            if (r() > 0.55) continue
            c.fillStyle = `rgba(125,232,208,${0.08 + r() * 0.45})`
            c.fillRect(wx, wy, 3, 5)
          }
      }
      c.filter = 'blur(7px)'
      for (let i = 0; i < 44; i++) {
        const x = ix + r() * iw * 0.7
        const y = iy + r() * ih
        const rad = 6 + r() * 24
        const col = ['120,240,200', '90,200,230', '200,255,230', '60,220,140'][i % 4]
        const g = c.createRadialGradient(x, y, 0, x, y, rad)
        g.addColorStop(0, `rgba(${col},${0.25 + r() * 0.4})`)
        g.addColorStop(1, `rgba(${col},0)`)
        c.fillStyle = g
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
      c.filter = 'none'
      // a stock-ticker billboard on the street
      const [bx, by, bw, bh] = [ix + iw * 0.6, iy + ih * 0.16, iw * 0.32, ih * 0.44]
      c.fillStyle = '#031210'
      c.fillRect(bx, by, bw, bh)
      c.strokeStyle = '#1d5c4f'
      c.lineWidth = 3
      c.strokeRect(bx, by, bw, bh)
      c.save()
      c.shadowBlur = 12
      let p = by + bh * 0.6
      for (let i = 0; i < 14; i++) {
        const up = r() > 0.4
        const h = 10 + r() * bh * 0.25
        p = Math.min(Math.max(p + (up ? -1 : 1) * r() * 18, by + bh * 0.2), by + bh * 0.8)
        c.fillStyle = c.shadowColor = up ? '#39e58c' : '#ff4f6d'
        c.fillRect(bx + 10 + i * (bw - 20) / 14, p - h / 2, (bw - 20) / 14 - 5, h)
      }
      c.restore()
      // vertical katakana sign
      const [kx, ky, ks] = [ix + iw * 0.52, iy + ih * 0.06, ih * 0.11]
      c.fillStyle = 'rgba(4,14,12,0.95)'
      c.fillRect(kx - ks * 0.65, ky, ks * 1.3, ks * 7.6)
      ;[...'ティックランド'].forEach((ch, i) =>
        text(c, ch, kx, ky + ks * (i + 0.95), `900 ${ks * 0.9}px "Noto Sans JP"`, '#39e58c', { align: 'center', glow: ['#39e58c', 18] }),
      )
      glow(c, ix + iw * 0.88, iy + ih * 0.4, iw * 0.45, '120,200,170', 0.2)
      const v = c.createRadialGradient(ix + iw / 2, iy + ih / 2, ih * 0.3, ix + iw / 2, iy + ih / 2, iw * 0.65)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.55)')
      c.fillStyle = v
      c.fillRect(ix, iy, iw, ih)
      c.restore()
    },
    fg(c) {
      text(c, 'MalharUdmale', S * 0.05, S * 0.205, `800 ${S * 0.034}px Archivo`, '#ffffff', { stretch: 'condensed' })
      // neon tube: glowing fill, then a thin darker seam down the middle of each stroke
      c.save()
      c.font = `500 ${S * 0.078}px Archivo`
      c.fontStretch = 'expanded'
      c.letterSpacing = `${S * 0.004}px`
      c.shadowColor = '#39e58c'
      c.shadowBlur = 22
      c.fillStyle = '#4ff09a'
      c.fillText('TICK LAND', S * 0.05, S * 0.3)
      c.shadowBlur = 0
      c.strokeStyle = 'rgba(10,80,45,0.8)'
      c.lineWidth = 1.5
      c.strokeText('TICK LAND', S * 0.05, S * 0.3)
      c.restore()
      advisory(c, S * 0.86, S * 0.89, S * 0.1, ['LOW-LATENCY', 'ADVISORY', 'LOCK-FREE CONTENT'])
    },
  },

  // Dawn FM: near-black, the subject rim-lit in cold cyan-blue, no title. The subject here is an old radio.
  // In the modal the bg becomes a live ShaderGradient of that blue glow.
  sacfm: {
    grain: 0.16,
    bg(c) {
      c.fillStyle = '#020304'
      c.fillRect(0, 0, S, S)
      glow(c, S * 0.72, S * 0.3, S * 0.55, '30,120,170', 0.34)
      glow(c, S * 0.25, S * 0.85, S * 0.45, '10,40,70', 0.35)
      vignette(c, 0.5)
    },
    fg(c) {
      const [x0, y0, w, h] = [S * 0.09, S * 0.38, S * 0.82, S * 0.47]
      // carrying strap
      c.lineCap = 'round'
      c.strokeStyle = '#0d1418'
      c.lineWidth = S * 0.028
      c.beginPath()
      c.moveTo(x0 + w * 0.14, y0 + 6)
      c.bezierCurveTo(x0 + w * 0.2, y0 - S * 0.17, x0 + w * 0.8, y0 - S * 0.17, x0 + w * 0.86, y0 + 6)
      c.stroke()
      c.strokeStyle = 'rgba(130,215,255,0.55)'
      c.lineWidth = 2.5
      c.stroke()
      const body = c.createLinearGradient(0, y0, 0, y0 + h)
      body.addColorStop(0, '#131c22')
      body.addColorStop(1, '#05080a')
      c.fillStyle = body
      c.beginPath()
      c.roundRect(x0, y0, w, h, S * 0.045)
      c.fill()
      c.save()
      c.clip()
      c.globalCompositeOperation = 'screen'
      glow(c, x0 + w, y0 - S * 0.05, S * 0.6, '70,170,220', 0.45)
      c.restore()
      const edge = c.createLinearGradient(x0, 0, x0 + w, 0)
      edge.addColorStop(0, 'rgba(120,210,255,0.06)')
      edge.addColorStop(1, 'rgba(150,225,255,0.85)')
      c.strokeStyle = edge
      c.lineWidth = 3
      c.stroke()
      // speaker grille, lit from the top right
      const [gx, gy, gw, gh] = [x0 + w * 0.06, y0 + h * 0.14, w * 0.5, h * 0.72]
      c.fillStyle = '#04070a'
      c.beginPath()
      c.roundRect(gx, gy, gw, gh, 14)
      c.fill()
      for (let y = gy + 12; y < gy + gh - 6; y += 15)
        for (let x = gx + 12; x < gx + gw - 6; x += 15) {
          const lit = Math.max(0, 1 - Math.hypot(x - (gx + gw), y - gy) / (gw * 1.3))
          c.fillStyle = `rgba(110,200,240,${0.06 + lit * 0.5})`
          c.beginPath()
          c.arc(x, y, 3.4, 0, Math.PI * 2)
          c.fill()
        }
      // tuning dial
      const [dx, dy, dw, dh] = [x0 + w * 0.61, y0 + h * 0.14, w * 0.33, h * 0.36]
      const dial = c.createLinearGradient(0, dy, 0, dy + dh)
      dial.addColorStop(0, '#0d2a33')
      dial.addColorStop(1, '#071419')
      c.fillStyle = dial
      c.beginPath()
      c.roundRect(dx, dy, dw, dh, 10)
      c.fill()
      text(c, 'SAC FM', dx + dw / 2, dy + dh * 0.3, `600 ${S * 0.022}px Archivo`, 'rgba(190,235,255,0.95)', {
        align: 'center',
        spacing: S * 0.008,
        stretch: 'expanded',
        glow: ['rgba(80,190,240,0.9)', 10],
      })
      for (let f = 88; f <= 108; f += 1) {
        const x = dx + dw * 0.08 + ((f - 88) / 20) * dw * 0.84
        const major = f % 4 === 0
        c.fillStyle = 'rgba(170,225,250,0.75)'
        c.fillRect(x - 0.75, dy + dh * (major ? 0.5 : 0.58), 1.5, dh * (major ? 0.2 : 0.12))
        if (major) text(c, String(f), x, dy + dh * 0.9, `500 ${S * 0.014}px Archivo`, 'rgba(170,225,250,0.75)', { align: 'center' })
      }
      const nx = dx + dw * 0.08 + ((103.5 - 88) / 20) * dw * 0.84
      c.fillStyle = '#ff4a2e'
      c.fillRect(nx - 1.5, dy + dh * 0.42, 3, dh * 0.36)
      // knobs
      for (const kx of [dx + dw * 0.25, dx + dw * 0.75]) {
        const ky = y0 + h * 0.74
        const knob = c.createRadialGradient(kx - 6, ky - 6, 2, kx, ky, S * 0.05)
        knob.addColorStop(0, '#1d2a31')
        knob.addColorStop(1, '#05080a')
        c.fillStyle = knob
        c.beginPath()
        c.arc(kx, ky, S * 0.045, 0, Math.PI * 2)
        c.fill()
        c.strokeStyle = 'rgba(140,220,255,0.7)'
        c.lineWidth = 2.5
        c.beginPath()
        c.arc(kx, ky, S * 0.045, -Math.PI * 0.55, Math.PI * 0.1)
        c.stroke()
      }
      advisory(c, S * 0.035, S * 0.895, S * 0.1, ['CAMPUS', 'ADVISORY', 'BOOKED CONTENT'])
    },
  },

  // Rodeo: an action-figure product shot on a cool grey studio sweep, gold chain, no title.
  // The figure here is a studio microphone (a voice agent) wearing the chain; the pendant spells "v" in braille.
  runnerup: {
    grain: 0.2,
    bg(c) {
      const g = c.createRadialGradient(S * 0.45, S * 0.3, 0, S * 0.5, S * 0.45, S * 0.9)
      g.addColorStop(0, '#6c7577')
      g.addColorStop(0.5, '#3d4547')
      g.addColorStop(1, '#1b2021')
      c.fillStyle = g
      c.fillRect(0, 0, S, S)
    },
    fg(c) {
      const [cx, cy, R] = [S * 0.47, S * 0.29, S * 0.17]
      c.save()
      c.translate(cx, S * 0.7)
      c.rotate(-0.06) // leans like the figure
      c.translate(-cx, -S * 0.7)
      // tapered handle, warm and glossy like the figure's plastic
      const handle = c.createLinearGradient(cx - R * 0.6, 0, cx + R * 0.6, 0)
      handle.addColorStop(0, '#140c06')
      handle.addColorStop(0.3, '#5a3a24')
      handle.addColorStop(0.46, '#d29a66')
      handle.addColorStop(0.62, '#6a4228')
      handle.addColorStop(1, '#120a05')
      c.fillStyle = handle
      c.beginPath()
      c.moveTo(cx - R * 0.58, cy + R * 0.9)
      c.lineTo(cx + R * 0.58, cy + R * 0.9)
      c.lineTo(cx + R * 0.4, S * 1.02)
      c.lineTo(cx - R * 0.4, S * 1.02)
      c.closePath()
      c.fill()
      c.save()
      c.filter = 'blur(6px)'
      c.fillStyle = 'rgba(255,240,220,0.35)'
      c.fillRect(cx - R * 0.16, cy + R * 1.2, R * 0.08, S * 0.5)
      c.restore()
      // ball grille
      const ball = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.15)
      ball.addColorStop(0, '#fff3d6')
      ball.addColorStop(0.25, '#d9a85e')
      ball.addColorStop(0.62, '#7a4c22')
      ball.addColorStop(1, '#22150a')
      c.fillStyle = ball
      c.beginPath()
      c.arc(cx, cy, R, 0, Math.PI * 2)
      c.fill()
      c.save()
      c.clip()
      c.strokeStyle = 'rgba(20,10,4,0.22)'
      c.lineWidth = 1
      for (let k = -7; k <= 7; k++) {
        const y = cy + (k * R) / 7.5
        c.beginPath()
        c.ellipse(cx, y, Math.sqrt(Math.max(R * R - ((k * R) / 7.5) ** 2, 0)), 4, 0, 0, Math.PI * 2)
        c.stroke()
        c.beginPath()
        c.ellipse(cx, cy, Math.abs(Math.sin((k / 7.5) * (Math.PI / 2))) * R, R, 0, 0, Math.PI * 2)
        c.stroke()
      }
      glow(c, cx - R * 0.4, cy - R * 0.45, R * 0.4, '255,252,240', 0.85)
      c.restore()
      c.strokeStyle = 'rgba(200,225,235,0.35)'
      c.lineWidth = 3
      c.beginPath()
      c.arc(cx, cy, R - 1.5, -Math.PI * 0.35, Math.PI * 0.3)
      c.stroke()
      // collar ring between ball and handle
      const ring = c.createLinearGradient(cx - R * 0.65, 0, cx + R * 0.65, 0)
      ring.addColorStop(0, '#5a3a14')
      ring.addColorStop(0.45, '#ffe08a')
      ring.addColorStop(1, '#5a3a14')
      c.fillStyle = ring
      c.beginPath()
      c.roundRect(cx - R * 0.62, cy + R * 0.82, R * 1.24, R * 0.2, R * 0.06)
      c.fill()
      c.restore()
      // gold chain hanging around the body
      const link = (x: number, y: number, a: number, i: number) => {
        c.save()
        c.translate(x, y)
        c.rotate(a + (i % 2 ? Math.PI / 2 : 0))
        c.strokeStyle = i % 2 ? '#b8860b' : '#ffd97a'
        c.lineWidth = 3.5
        c.beginPath()
        c.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2)
        c.stroke()
        c.restore()
      }
      const [ax, ay, bx, by, px, py] = [S * 0.35, S * 0.47, S * 0.47, S * 0.8, S * 0.6, S * 0.47]
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * bx + t ** 2 * px
        const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * by + t ** 2 * py
        const dxt = 2 * (1 - t) * (bx - ax) + 2 * t * (px - bx)
        const dyt = 2 * (1 - t) * (by - ay) + 2 * t * (py - by)
        link(x, y, Math.atan2(dyt, dxt), i)
      }
      // pendant: white enamel with a red rim, braille "v"
      const [qx, qy, qr] = [S * 0.47, S * 0.685, S * 0.042]
      c.fillStyle = '#d4a73a'
      c.beginPath()
      c.arc(qx, qy, qr + 5, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#f7f4ee'
      c.beginPath()
      c.arc(qx, qy, qr, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = '#c8102e'
      c.lineWidth = 5
      c.stroke()
      c.fillStyle = '#1a1a1a'
      for (const d of [1, 2, 3, 6]) {
        const col = d > 3 ? 1 : 0
        const row = (d - 1) % 3
        c.beginPath()
        c.arc(qx + (col - 0.5) * qr * 0.5, qy + (row - 1) * qr * 0.42, qr * 0.11, 0, Math.PI * 2)
        c.fill()
      }
      text(c, 'RUNNER UP', S * 0.05, S * 0.93, `700 ${S * 0.022}px Archivo`, 'rgba(255,255,255,0.88)', { spacing: S * 0.01, stretch: 'expanded' })
      text(c, 'SARVAM AI CAMPUS HACKATHON', S * 0.05, S * 0.958, `500 ${S * 0.014}px Archivo`, 'rgba(255,255,255,0.6)', { spacing: S * 0.006 })
      advisory(c, S * 0.84, S * 0.89, S * 0.12, ['SPOKEN', 'ADVISORY', 'VOICE CONTENT'])
    },
  },

  // Whole Lotta Red: a punk-zine page. Off-white paper, a black panel holding a two-tone stencil, the title scrawled in
  // dripping red brush script across the panel's top edge, a sideways caption and an issue line along the foot.
  // The stencil here is a web page under a magnifying glass with a warning flag: the tool found sites' issues.
  wholelotta: {
    grain: 0.14,
    bg(c) {
      const paper = '#f2f0ec'
      const ink = '#0b0b0b'
      c.fillStyle = paper
      c.fillRect(0, 0, S, S)
      const [x0, y0, x1, y1] = [S * 0.18, S * 0.066, S * 0.81, S * 0.93]
      c.fillStyle = ink
      c.fillRect(x0, y0, x1 - x0, y1 - y0)
      const art = stencil(t => {
        t.translate(S * 0.5, S * 0.63)
        t.rotate(-0.08)
        t.fillStyle = paper
        t.strokeStyle = paper
        t.lineCap = 'round'
        t.lineJoin = 'round'
        // browser window
        const [bw, bh] = [S * 0.46, S * 0.34]
        t.lineWidth = S * 0.018
        t.beginPath()
        t.roundRect(-bw / 2, -bh / 2, bw, bh, S * 0.02)
        t.stroke()
        t.fillRect(-bw / 2, -bh / 2, bw, S * 0.05)
        t.fillStyle = ink
        for (let k = 0; k < 3; k++) {
          t.beginPath()
          t.arc(-bw / 2 + S * (0.03 + k * 0.03), -bh / 2 + S * 0.026, S * 0.009, 0, Math.PI * 2)
          t.fill()
        }
        t.fillStyle = paper
        ;[0.62, 0.48, 0.55, 0.36].forEach((f, i) => t.fillRect(-bw / 2 + S * 0.04, -bh / 2 + S * (0.09 + i * 0.045), bw * f, S * 0.018))
        // warning flag on the page
        const [tx, ty, ts] = [bw * 0.27, -bh * 0.02, S * 0.085]
        t.beginPath()
        t.moveTo(tx, ty - ts * 0.6)
        t.lineTo(tx + ts * 0.62, ty + ts * 0.5)
        t.lineTo(tx - ts * 0.62, ty + ts * 0.5)
        t.closePath()
        t.fill()
        t.fillStyle = ink
        t.fillRect(tx - S * 0.006, ty - ts * 0.22, S * 0.012, ts * 0.42)
        t.fillRect(tx - S * 0.006, ty + ts * 0.27, S * 0.012, S * 0.012)
        // magnifying glass over the lower left of the page
        const [mx, my, mr] = [-bw * 0.16, bh * 0.16, S * 0.09]
        t.beginPath()
        t.arc(mx, my, mr, 0, Math.PI * 2)
        t.fill()
        t.lineWidth = S * 0.022
        t.stroke()
        t.lineWidth = S * 0.008
        t.beginPath()
        t.arc(mx, my, mr * 0.68, Math.PI * 1.1, Math.PI * 1.45)
        t.stroke()
        t.lineWidth = S * 0.036
        t.beginPath()
        t.moveTo(mx - mr * 0.75, my + mr * 0.75)
        t.lineTo(mx - mr * 1.9, my + mr * 1.9)
        t.stroke()
      }, 83)
      c.save()
      c.beginPath()
      c.rect(x0, y0, x1 - x0, y1 - y0)
      c.clip()
      c.drawImage(art, 0, 0)
      c.restore()
    },
    fg(c) {
      const red = '#d8141c'
      const size = S * 0.22
      const [sx, base] = [S * 0.24, S * 0.28]
      c.save()
      c.font = `${size}px Yellowtail`
      const w = c.measureText('Top 8').width
      c.fillStyle = red
      c.strokeStyle = red
      c.lineJoin = 'round'
      c.lineWidth = S * 0.006 // thickens the script toward the original's chunky brush
      c.strokeText('Top 8', sx, base)
      c.fillText('Top 8', sx, base)
      // the long brush tail trailing up past the panel's corner
      c.strokeStyle = red
      c.lineCap = 'round'
      c.lineWidth = S * 0.007
      c.beginPath()
      c.moveTo(sx + w * 0.86, base - size * 0.12)
      c.quadraticCurveTo(sx + w * 1.05, base - size * 0.32, S * 0.77, S * 0.045)
      c.stroke()
      // paint running down from the letters
      const r = seeded(97)
      for (const f of [0.08, 0.2, 0.35, 0.5, 0.64, 0.8, 0.92]) {
        const x = sx + w * f + (r() - 0.5) * 10
        const y = base - size * (0.1 + r() * 0.1) // start inside the strokes
        const len = S * (0.05 + r() * 0.1)
        const lw = 8 + r() * 6
        c.lineWidth = lw
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + (r() - 0.5) * 3, y + len)
        c.stroke()
        c.beginPath()
        c.arc(x, y + len, lw * 0.85, 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
      c.save()
      c.translate(S * 0.835, S * 0.07)
      c.rotate(Math.PI / 2)
      text(c, 'the wonderful world of 1 lakh+ teams', 0, 0, `500 ${S * 0.024}px Archivo`, '#141414', { fit: S * 0.62 })
      c.restore()
      const foot = `500 ${S * 0.015}px Archivo`
      const o = { stretch: 'condensed' as CanvasFontStretch, spacing: S * 0.001 }
      text(c, 'VOLUME ONE  NUMBER EIGHT', S * 0.18, S * 0.968, foot, '#141414', { ...o, fit: S * 0.2 })
      text(c, 'ADOBE  ISSUE  2026', S * 0.495, S * 0.968, foot, '#141414', { ...o, align: 'center', fit: S * 0.15 })
      text(c, 'IIIT ALLAHABAD', S * 0.81, S * 0.968, foot, '#141414', { ...o, align: 'right', fit: S * 0.16 })
      advisory(c, S * 0.012, S * 0.935, S * 0.09, ['HACKATHON', 'ADVISORY', 'TOP 8 CONTENT'])
    },
  },

  // DANGEROUS SUMMER: a grainy black-and-white night flash photo with a yellow strip down the left edge, the title
  // reading upwards. The photo here is a late-night training run: a laptop on a white plastic table, an energy drink,
  // a plastic chair, and the motion-blurred hand in front of the lens that the original has.
  dangerous: {
    grain: 0.46,
    bg(c) {
      c.fillStyle = '#050505'
      c.fillRect(0, 0, S, S)
      const flash = c.createRadialGradient(S * 0.6, S * 0.6, S * 0.05, S * 0.6, S * 0.6, S * 0.78)
      flash.addColorStop(0, '#565656')
      flash.addColorStop(0.55, '#171717')
      flash.addColorStop(1, '#050505')
      c.fillStyle = flash
      c.fillRect(0, 0, S, S)
      const r = seeded(101)
      // white plastic chair behind the table: curved back with slats, catching the flash
      c.save()
      c.filter = 'blur(2px)'
      c.strokeStyle = 'rgba(214,214,214,0.7)'
      c.lineCap = 'round'
      c.lineWidth = S * 0.028
      c.beginPath()
      c.moveTo(S * 0.12, S * 0.72)
      c.lineTo(S * 0.13, S * 0.4)
      c.quadraticCurveTo(S * 0.27, S * 0.32, S * 0.41, S * 0.4)
      c.lineTo(S * 0.42, S * 0.62)
      c.stroke()
      c.lineWidth = S * 0.016
      for (const y of [0.45, 0.51, 0.57]) {
        c.beginPath()
        c.moveTo(S * 0.135, S * y)
        c.quadraticCurveTo(S * 0.27, S * (y - 0.05), S * 0.415, S * y)
        c.stroke()
      }
      c.restore()
      // white plastic table, scuffed
      const table = c.createLinearGradient(0, S * 0.76, 0, S)
      table.addColorStop(0, '#ececec')
      table.addColorStop(1, '#8a8a8a')
      c.fillStyle = table
      c.beginPath()
      c.ellipse(S * 0.7, S * 1.0, S * 0.56, S * 0.24, -0.04, 0, Math.PI * 2)
      c.fill()
      for (let i = 0; i < 260; i++) {
        c.fillStyle = `rgba(40,40,40,${r() * 0.25})`
        c.fillRect(S * (0.2 + r() * 0.8), S * (0.8 + r() * 0.2), 2 + r() * 14, 1 + r() * 2)
      }
      // laptop, close and central like the original's subject; the screen shows the score
      c.save()
      c.translate(S * 0.6, S * 0.86)
      c.scale(1.35, 1.35)
      c.fillStyle = '#262626'
      c.beginPath()
      c.moveTo(-S * 0.2, 0)
      c.lineTo(S * 0.2, 0)
      c.lineTo(S * 0.24, S * 0.06)
      c.lineTo(-S * 0.24, S * 0.06)
      c.fill()
      c.fillStyle = '#121212'
      c.beginPath()
      c.moveTo(-S * 0.19, 0)
      c.lineTo(S * 0.19, 0)
      c.lineTo(S * 0.17, -S * 0.3)
      c.lineTo(-S * 0.17, -S * 0.3)
      c.fill()
      const screen = c.createLinearGradient(0, -S * 0.28, 0, 0)
      screen.addColorStop(0, '#d2d2d2')
      screen.addColorStop(1, '#8e8e8e')
      c.fillStyle = screen
      c.beginPath()
      c.moveTo(-S * 0.17, -S * 0.015)
      c.lineTo(S * 0.17, -S * 0.015)
      c.lineTo(S * 0.155, -S * 0.285)
      c.lineTo(-S * 0.155, -S * 0.285)
      c.fill()
      text(c, '95.8%', 0, -S * 0.19, `800 ${S * 0.055}px Archivo`, '#141414', { align: 'center' })
      c.strokeStyle = '#1c1c1c'
      c.lineWidth = 3
      c.beginPath()
      ;[0.02, 0.08, 0.06, 0.12, 0.16, 0.15, 0.2].forEach((v, i) => {
        const x = -S * 0.13 + i * S * 0.043
        const y = -S * 0.04 - v * S * 0.45
        if (i === 0) c.moveTo(x, y)
        else c.lineTo(x, y)
      })
      c.stroke()
      c.restore()
      glow(c, S * 0.6, S * 0.6, S * 0.3, '230,230,230', 0.12) // screen bloom
      // energy drink
      const can = c.createLinearGradient(S * 0.24, 0, S * 0.31, 0)
      can.addColorStop(0, '#4a4a4a')
      can.addColorStop(0.45, '#e6e6e6')
      can.addColorStop(1, '#5e5e5e')
      c.fillStyle = can
      c.fillRect(S * 0.24, S * 0.74, S * 0.07, S * 0.15)
      c.fillStyle = '#c4c4c4'
      c.beginPath()
      c.ellipse(S * 0.275, S * 0.74, S * 0.035, S * 0.009, 0, 0, Math.PI * 2)
      c.fill()
      // the hand in front of the lens, blurred and blown out by the flash
      c.save()
      c.filter = 'blur(22px)'
      c.fillStyle = 'rgba(232,232,232,0.92)'
      c.beginPath()
      c.ellipse(S * 0.3, S * 0.0, S * 0.14, S * 0.1, 0.2, 0, Math.PI * 2)
      c.fill()
      for (const [fx, fy] of [
        [0.18, 0.12],
        [0.27, 0.16],
        [0.36, 0.15],
        [0.44, 0.1],
      ]) {
        c.beginPath()
        c.ellipse(S * fx, S * fy, S * 0.03, S * 0.09, -0.45, 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
      // cheap point-and-shoot: a little soft, very contrasty
      const copy = makeCanvas()
      const cc = ctx2d(copy)
      cc.filter = 'blur(1.4px)'
      cc.drawImage(c.canvas, 0, 0)
      c.drawImage(copy, 0, 0)
      c.globalCompositeOperation = 'overlay'
      c.drawImage(copy, 0, 0)
      c.globalCompositeOperation = 'source-over'
      vignette(c, 0.5)
    },
    fg(c) {
      const w = S * 0.085
      c.fillStyle = '#f6d808'
      c.fillRect(0, 0, w, S)
      c.save()
      c.translate(w * 0.52, S * 0.985)
      c.rotate(-Math.PI / 2) // reads bottom to top
      c.fillStyle = '#111111'
      c.textBaseline = 'middle'
      const word = (s: string, weight: number, stretch: CanvasFontStretch, max: number, x: number) => {
        c.font = `${weight} ${w * 1.02}px Archivo`
        c.fontStretch = stretch
        const m = c.measureText(s).width
        if (m > max) c.font = `${weight} ${(w * 1.02 * max) / m}px Archivo`
        c.fontStretch = stretch // setting font resets the stretch
        c.fillText(s, x, 0)
        return Math.min(m, max)
      }
      const first = word('DANGEROUSLY', 800, 'extra-condensed', S * 0.42, 0)
      word('ACCURATE', 900, 'expanded', S * 0.97 - first - S * 0.025, first + S * 0.025)
      c.restore()
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
