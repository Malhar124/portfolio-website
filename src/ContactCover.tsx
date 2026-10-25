import { useEffect, useRef } from 'react'
import { ctx2d, grain, seeded, text } from './covers'

// Front of the contact sleeve, after The Weeknd's My Dear Melancholy,: black, a thin rust frame, the title in rust
// bold italic serif across the top and "MY DEAR" running up the left edge, and a close-up in rust duotone falling
// into shadow. Here the close-up is a sealed envelope, and the letter is to the reader. Coordinates are in the
// original's 640px units.

const S = 1024
const k = S / 640
const RUST = '#d4561d'

function paint(c: HTMLCanvasElement) {
  const x = ctx2d(c)
  const r = seeded(19)
  x.fillStyle = '#070504'
  x.fillRect(0, 0, S, S)

  // the envelope, lit from above the seal and lost in shadow towards the corners
  x.save()
  x.translate(340 * k, 320 * k)
  x.rotate(-0.06)
  const [w, h] = [470 * k, 330 * k]
  const paper = x.createRadialGradient(-30 * k, -120 * k, 20 * k, 0, 0, 360 * k)
  paper.addColorStop(0, '#d9662a')
  paper.addColorStop(0.45, '#8f3412')
  paper.addColorStop(1, '#1e0904')
  x.fillStyle = paper
  x.fillRect(-w / 2, -h / 2, w, h)
  // the flap folding down to the seal, a little lighter than the body
  x.fillStyle = 'rgba(255,140,80,0.1)'
  x.beginPath()
  x.moveTo(-w / 2, -h / 2)
  x.lineTo(w / 2, -h / 2)
  x.lineTo(20 * k, 10 * k)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(20,6,2,0.75)'
  x.lineWidth = 3 * k
  x.stroke()
  // a handwritten address, too far into the dark to read
  x.strokeStyle = 'rgba(25,8,3,0.55)'
  x.lineWidth = 2 * k
  for (let row = 0; row < 3; row++) {
    x.beginPath()
    const y = (60 + row * 30) * k
    for (let i = 0; i <= 26; i++) x.lineTo((-170 + i * 6 + row * 20) * k, y + Math.sin(i * 1.7 + row) * 6 * k + (r() - 0.5) * 4 * k)
    x.stroke()
  }
  // the wax seal, where the eye is on the original
  const seal = x.createRadialGradient(10 * k, 0, 4 * k, 20 * k, 10 * k, 50 * k)
  seal.addColorStop(0, '#b5401a')
  seal.addColorStop(0.7, '#5d1a07')
  seal.addColorStop(1, '#2a0a03')
  x.fillStyle = seal
  x.beginPath()
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const rr = (44 + (r() - 0.5) * 7) * k
    x.lineTo(20 * k + Math.cos(a) * rr, 10 * k + Math.sin(a) * rr)
  }
  x.fill()
  x.strokeStyle = 'rgba(255,150,90,0.35)'
  x.lineWidth = 2 * k
  x.beginPath()
  x.arc(20 * k, 10 * k, 30 * k, 0, Math.PI * 2)
  x.stroke()
  text(x, 'M', 20 * k, 24 * k, `italic 700 ${40 * k}px "Bodoni Moda"`, 'rgba(30,8,2,0.8)', { align: 'center' })
  x.restore()

  // the shadow taking the lower left, as it takes most of the face on the original
  const shade = x.createRadialGradient(360 * k, 230 * k, 110 * k, 360 * k, 260 * k, 430 * k)
  shade.addColorStop(0, 'rgba(7,5,4,0)')
  shade.addColorStop(1, 'rgba(7,5,4,0.92)')
  x.fillStyle = shade
  x.fillRect(0, 0, S, S)
  grain(x, 0.32)

  x.strokeStyle = '#5a230e'
  x.lineWidth = 1.5 * k
  x.strokeRect(57 * k, 52 * k, 528 * k, 533 * k)
  text(x, 'READER,', 20 * k, 34 * k, `italic 700 ${31 * k}px "Bodoni Moda"`, RUST, { spacing: 1.2 * k })
  x.save()
  x.translate(40 * k, 212 * k)
  x.rotate(-Math.PI / 2)
  text(x, 'MY DEAR', 0, 0, `italic 700 ${27 * k}px "Bodoni Moda"`, RUST, { spacing: 1.2 * k })
  x.restore()

  // the advisory sticker, printed in rust like everything else on this sleeve
  const [ax, ay, aw] = [578 * k, 602 * k, 52 * k]
  x.fillStyle = '#070504'
  x.fillRect(ax, ay, aw, aw * 0.62)
  x.strokeStyle = RUST
  x.lineWidth = 1.2 * k
  x.strokeRect(ax + 2 * k, ay + 2 * k, aw - 4 * k, aw * 0.62 - 4 * k)
  text(x, 'INBOX', ax + aw / 2, ay + 10 * k, `700 ${5 * k}px Archivo`, RUST, { align: 'center' })
  x.fillStyle = RUST
  x.fillRect(ax + 6 * k, ay + 12 * k, aw - 12 * k, 9 * k)
  text(x, 'ADVISORY', ax + aw / 2, ay + 19.5 * k, `900 ${7 * k}px Archivo`, '#070504', { align: 'center', stretch: 'condensed', fit: aw - 14 * k })
  text(x, 'OPEN TO MAIL', ax + aw / 2, ay + 28 * k, `700 ${4.5 * k}px Archivo`, RUST, { align: 'center' })
}

export default function ContactCover() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => paint(ref.current!), [])
  return <canvas ref={ref} className="sleeve__front" width={S} height={S} aria-hidden />
}
