import { useEffect, useRef } from 'react'
import { ctx2d, grain, seeded, text } from './covers'
import { profile } from './data'
import { paintPhotoPlaceholder } from './textures'

// Front of the contact sleeve: a photographer's contact sheet of the portrait (a pun on the section), marked up in
// red grease pencil. Uses public/photo.jpg once it exists, the sepia placeholder until then.

const S = 1024
const M = 44
const ROWS = 4
const COLS = 4
const GAP = 14
const REBATE = 32 // film edge above and below the frames, where the sprocket holes and frame numbers are
const STRIP_W = S - M * 2
const FW = (STRIP_W - GAP * (COLS + 1)) / COLS
const FH = FW / 1.5
const STRIP_H = FH + REBATE * 2
const TOP = 96
const ROW_GAP = 18
const RED = '#c4301c'
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const frameAt = (row: number, col: number) => ({
  x: M + GAP + col * (FW + GAP),
  y: TOP + row * (STRIP_H + ROW_GAP) + REBATE,
})

function paint(c: HTMLCanvasElement, photo: HTMLImageElement | HTMLCanvasElement, [fx, fy]: [number, number]) {
  const x = ctx2d(c)
  const r = seeded(23)
  x.fillStyle = '#ebe5d9'
  x.fillRect(0, 0, S, S)
  text(x, profile.name, M, 64, '800 40px Archivo', '#231b14', { stretch: 'condensed' })

  let n = 1
  for (let row = 0; row < ROWS; row++) {
    const y = TOP + row * (STRIP_H + ROW_GAP)
    x.save()
    x.translate(S / 2, y + STRIP_H / 2)
    x.rotate((r() - 0.5) * 0.014)
    x.translate(-S / 2, -(y + STRIP_H / 2))
    x.fillStyle = '#0f0d0c'
    x.fillRect(M, y, STRIP_W, STRIP_H)
    x.fillStyle = '#2b2825'
    for (let sx = M + 8; sx < M + STRIP_W - 16; sx += 23) {
      x.fillRect(sx, y + 5, 11, 13)
      x.fillRect(sx, y + STRIP_H - 18, 11, 13)
    }
    for (let col = 0; col < COLS; col++, n++) {
      const f = frameAt(row, col)
      // every frame a different crop around the subject (wide shot to close-up) and exposure, like a real roll
      const zoom = 1.4 + r() * 2
      const w = FW * zoom
      const h = (w * photo.height) / photo.width
      const px = clamp(f.x + FW / 2 - fx * w + (r() - 0.5) * FW * 0.3, f.x + FW - w, f.x)
      const py = clamp(f.y + FH / 2 - fy * h + (r() - 0.5) * FH * 0.3, f.y + FH - h, f.y)
      x.save()
      x.beginPath()
      x.rect(f.x, f.y, FW, FH)
      x.clip()
      x.filter = `grayscale(1) contrast(1.2) brightness(${0.75 + r() * 0.5})`
      x.drawImage(photo, px, py, w, h)
      x.restore()
      text(x, `${n}`, f.x + 4, f.y + FH + 25, '700 15px "Courier Prime"', '#cfc6b4')
      text(x, `${n}A`, f.x + FW / 2, f.y + FH + 25, '700 15px "Courier Prime"', '#cfc6b4')
    }
    text(x, profile.fileNo, M + STRIP_W - 30, y + 26, '700 13px "Courier Prime"', '#8f877a', { align: 'right' })
    x.restore()
  }
  grain(x, 0.14)

  // grease pencil: the pick circled, a reject crossed out, the title written across the sheet
  x.save()
  x.strokeStyle = RED
  x.lineCap = 'round'
  x.globalAlpha = 0.92
  x.lineWidth = 7
  const pick = frameAt(1, 2)
  for (const k of [0, 1]) {
    x.beginPath()
    x.ellipse(pick.x + FW / 2 + k * 4, pick.y + FH / 2 - k * 3, FW / 2 + 22, FH / 2 + 28, -0.05, 0.3 + k, Math.PI * 2 + 0.55 + k)
    x.stroke()
  }
  const reject = frameAt(2, 0)
  x.beginPath()
  x.moveTo(reject.x + 10, reject.y + 8)
  x.lineTo(reject.x + FW - 12, reject.y + FH - 6)
  x.moveTo(reject.x + FW - 8, reject.y + 12)
  x.lineTo(reject.x + 14, reject.y + FH - 10)
  x.stroke()
  x.translate(S - M - 10, S - 70)
  x.rotate(-0.09)
  text(x, 'Contact', 0, 0, '172px Yellowtail', RED, { align: 'right' })
  x.restore()
}

export default function ContactCover() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const img = new Image()
    const draw = (photo: HTMLImageElement | HTMLCanvasElement, focus: [number, number]) => ref.current && paint(ref.current, photo, focus)
    img.onload = () => draw(img, profile.photoFocus)
    img.onerror = () => draw(paintPhotoPlaceholder(), [0.5, 0.45])
    img.src = profile.photo
  }, [])
  return <canvas ref={ref} className="sleeve__front" width={S} height={S} aria-hidden />
}
