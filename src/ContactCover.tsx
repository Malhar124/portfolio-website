import { useEffect, useRef } from 'react'
import { ctx2d, grain, makeCanvas, seeded, text } from './covers'

// Front of the contact sleeve, after The Weeknd's House of Balloons: white paper, the name in heavy grotesque over a
// grey-step bar and the title, a two-line tracklist (here, the ways to reach me), and a grainy black-and-white photo
// of black and white balloons heaped in a tiled bathtub corner. Coordinates are in the original's 640px units.

const S = 1024
const k = S / 640
const INK = '#232323'
const [PX, PY, PW, PH] = [22, 186, 596, 397] // the photo

// [x, y, rx, ry, dark], back to front, read off the original
const BALLOONS: [number, number, number, number, boolean][] = [
  [92, 226, 88, 70, false],
  [228, 210, 60, 46, true],
  [300, 272, 48, 50, false],
  [86, 376, 74, 80, true],
  [482, 470, 66, 70, false],
  [252, 362, 56, 60, false],
  [198, 408, 38, 46, false],
  [602, 505, 62, 82, true],
  [290, 456, 42, 46, true],
  [72, 550, 56, 46, true],
  [190, 522, 58, 62, true],
  [416, 542, 70, 58, false],
  [302, 548, 56, 54, true],
  [338, 512, 30, 26, false],
  [374, 420, 46, 48, false], // where the figure is in the original
]

// a tiled wall: square tiles of side `size`, rotated by `angle`, filling the current clip
function tiles(x: CanvasRenderingContext2D, angle: number, size: number) {
  x.save()
  x.translate((PX + PW / 2) * k, (PY + PH / 2) * k)
  x.rotate(angle)
  x.strokeStyle = 'rgba(95,95,95,0.6)'
  x.lineWidth = 1.2 * k
  const R = PW * k
  for (let t = -R; t <= R; t += size * k) {
    x.beginPath()
    x.moveTo(t, -R)
    x.lineTo(t, R)
    x.moveTo(-R, t)
    x.lineTo(R, t)
    x.stroke()
  }
  x.restore()
}

function balloon(x: CanvasRenderingContext2D, [cx, cy, rx, ry, dark]: (typeof BALLOONS)[number], r: () => number) {
  ;[cx, cy, rx, ry] = [cx * k, cy * k, rx * k, ry * k]
  const body = x.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, rx * 0.05, cx, cy, Math.max(rx, ry) * 1.05)
  if (dark) {
    body.addColorStop(0, '#5a5a5a')
    body.addColorStop(0.35, '#1c1c1c')
    body.addColorStop(1, '#050505')
  } else {
    body.addColorStop(0, '#ffffff')
    body.addColorStop(0.55, '#e4e4e4')
    body.addColorStop(1, '#8c8c8c')
  }
  x.fillStyle = body
  x.beginPath()
  x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  x.fill()
  // glossy highlight, and on the black ones the dust the flash picks up
  const hl = x.createRadialGradient(cx - rx * 0.4, cy - ry * 0.45, 0, cx - rx * 0.4, cy - ry * 0.45, rx * 0.4)
  hl.addColorStop(0, `rgba(255,255,255,${dark ? 0.55 : 0.9})`)
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = hl
  x.fill()
  if (dark) {
    x.fillStyle = 'rgba(255,255,255,0.8)'
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * 0.8
      x.fillRect(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (1 + r() * 2) * k, (1 + r() * 2) * k)
    }
  }
}

function paint(c: HTMLCanvasElement) {
  const x = ctx2d(c)
  const r = seeded(31)
  x.fillStyle = '#f1f0ec'
  x.fillRect(0, 0, S, S)
  // faint grime on the paper
  for (let i = 0; i < 9; i++) {
    const [gx, gy, gr] = [r() * S, r() * S, (60 + r() * 160) * k]
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, gr)
    g.addColorStop(0, 'rgba(120,120,115,0.07)')
    g.addColorStop(1, 'rgba(120,120,115,0)')
    x.fillStyle = g
    x.fillRect(0, 0, S, S)
  }

  // crop marks in the corners
  x.fillStyle = INK
  for (const [mx, my] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const ox = mx ? S - 7 * k : 7 * k
    const oy = my ? S - 7 * k : 7 * k
    x.fillRect(mx ? ox - 8 * k : ox, oy, 8 * k, 1.1 * k)
    x.fillRect(ox, my ? oy - 8 * k : oy, 1.1 * k, 8 * k)
  }

  text(x, 'MalharUdmale', 18 * k, 88 * k, `800 ${76 * k}px Archivo`, INK, { spacing: -2.6 * k, fit: 600 * k })
  x.fillStyle = INK
  x.fillRect(20 * k, 96 * k, 600 * k, 1.1 * k)
  for (let i = 0; i < 8; i++) {
    const v = Math.round(222 - (i / 7) * 205)
    x.fillStyle = `rgb(${v},${v},${v})`
    x.fillRect((20 + i * 28.25) * k, 102 * k, 28.25 * k + 0.5, 28 * k)
  }
  text(x, 'Contacts', 253 * k, 130 * k, `800 ${37 * k}px Archivo`, INK, { spacing: -1.2 * k, fit: 365 * k })
  x.fillStyle = INK
  x.fillRect(20 * k, 135 * k, 600 * k, 1.1 * k)

  // the tracklist, each line justified edge to edge
  const tracks = [
    '1 IIB2024020@IIITA.AC.IN 2 GITHUB.COM/MALHAR124 3 LINKEDIN.COM/IN/MALHAR-UDMALE',
    '4 RÉSUMÉ, ONE-PAGE PDF 5 THE ONE-PAGE VERSION, FOR A QUICK READ OR FOR PRINTING',
  ]
  tracks.forEach((line, i) => {
    x.save()
    x.font = `700 ${15 * k}px Archivo`
    x.fontStretch = 'condensed'
    const spare = 598 * k - x.measureText(line).width
    x.restore()
    // canvas adds the spacing after every letter, the last one too
    text(x, line, 20 * k, (148 + i * 16) * k, `700 ${15 * k}px Archivo`, INK, {
      stretch: 'condensed',
      spacing: Math.max(0, spare / line.length),
      fit: spare < 0 ? 598 * k : undefined,
    })
  })

  // the photo
  x.save()
  x.beginPath()
  x.rect(PX * k, PY * k, PW * k, PH * k)
  x.clip()
  x.fillStyle = '#f5f5f5'
  x.fillRect(PX * k, PY * k, PW * k, PH * k)
  // two walls meeting in the tub corner, tiles at different angles
  x.save()
  x.beginPath()
  x.moveTo(PX * k, PY * k)
  x.lineTo(352 * k, PY * k)
  x.lineTo(470 * k, (PY + PH) * k)
  x.lineTo(PX * k, (PY + PH) * k)
  x.clip()
  tiles(x, 0.62, 44)
  x.restore()
  x.save()
  x.beginPath()
  x.moveTo(352 * k, PY * k)
  x.lineTo((PX + PW) * k, PY * k)
  x.lineTo((PX + PW) * k, (PY + PH) * k)
  x.lineTo(470 * k, (PY + PH) * k)
  x.clip()
  tiles(x, -0.38, 48)
  x.restore()
  // light from the top right, the heap falling into shadow at the bottom left
  const light = x.createLinearGradient((PX + PW) * k, PY * k, PX * k, (PY + PH) * k)
  light.addColorStop(0, 'rgba(0,0,0,0)')
  light.addColorStop(0.55, 'rgba(0,0,0,0.12)')
  light.addColorStop(1, 'rgba(0,0,0,0.5)')
  x.fillStyle = light
  x.fillRect(PX * k, PY * k, PW * k, PH * k)
  const glare = x.createRadialGradient(560 * k, 210 * k, 0, 560 * k, 210 * k, 300 * k)
  glare.addColorStop(0, 'rgba(255,255,255,0.6)')
  glare.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = glare
  x.fillRect(PX * k, PY * k, PW * k, PH * k)

  BALLOONS.forEach(b => balloon(x, b, r))
  // ribbons trailing out of the heap
  x.strokeStyle = 'rgba(245,245,245,0.85)'
  x.lineWidth = 1.4 * k
  for (const [ax, ay, bx, by, ex, ey] of [
    [140, 583, 190, 560, 300, 572],
    [230, 583, 260, 566, 350, 575],
    [120, 470, 150, 500, 135, 540],
  ]) {
    x.beginPath()
    x.moveTo(ax * k, ay * k)
    x.quadraticCurveTo(bx * k, by * k, ex * k, ey * k)
    x.stroke()
  }
  // the flash flaring off the black balloon in the middle
  const flare = x.createRadialGradient(318 * k, 446 * k, 0, 318 * k, 446 * k, 26 * k)
  flare.addColorStop(0, 'rgba(255,255,255,0.95)')
  flare.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = flare
  x.fillRect(PX * k, PY * k, PW * k, PH * k)

  const v = x.createRadialGradient(320 * k, 384 * k, 140 * k, 320 * k, 384 * k, 420 * k)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.35)')
  x.fillStyle = v
  x.fillRect(PX * k, PY * k, PW * k, PH * k)
  // print it like the photo: hard contrast, a touch soft, then fine grain
  const shot = makeCanvas(PW * k, PH * k)
  ctx2d(shot).drawImage(c, PX * k, PY * k, PW * k, PH * k, 0, 0, PW * k, PH * k)
  x.filter = 'contrast(1.35) brightness(1.04) blur(0.8px)'
  x.drawImage(shot, PX * k, PY * k)
  x.filter = 'none'
  grain(x, 0.3)
  x.restore()

  // bottom right: a short bar and the title in small type
  x.fillStyle = INK
  x.fillRect(566 * k, 600 * k, 50 * k, 4 * k)
  text(x, 'House Of Balloons', 616 * k, 615 * k, `600 ${6.5 * k}px Archivo`, INK, { align: 'right' })
  grain(x, 0.08)
}

export default function ContactCover() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => paint(ref.current!), [])
  return <canvas ref={ref} className="sleeve__front" width={S} height={S} aria-hidden />
}
