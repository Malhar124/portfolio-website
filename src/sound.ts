// Opt-in sound, synthesised with Web Audio so there are no audio files to download. Nothing plays until the visitor
// turns sound on, and the audio context is only ever created from a click or key press (setEnabled / unlock), since
// browsers refuse to start audio before a user gesture. The choice is remembered per browser.
const KEY = 'sound'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let crackle: AudioBufferSourceNode | null = null
let wantCrackle = false
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
})()

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(seconds: number, shape: (i: number, n: number) => number) {
  const a = audio()
  const n = Math.floor(a.sampleRate * seconds)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = shape(i, n)
  return buf
}

function play(buf: AudioBuffer, gain: number, filter?: (f: BiquadFilterNode, t: number) => void) {
  const a = audio()
  const src = a.createBufferSource()
  src.buffer = buf
  const g = a.createGain()
  g.gain.value = gain
  let node: AudioNode = src
  if (filter) {
    const f = a.createBiquadFilter()
    filter(f, a.currentTime)
    node.connect(f)
    node = f
  }
  node.connect(g).connect(master!)
  src.start()
  return src
}

// Low sine thump, for things landing.
function thump(freq: number, seconds: number, gain: number) {
  const a = audio()
  const o = a.createOscillator()
  const g = a.createGain()
  const t = a.currentTime
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + seconds)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + seconds)
}

function startCrackle() {
  if (crackle || !enabled || !wantCrackle || !ctx) return
  // surface noise: faint hiss plus sparse pops, looped
  const buf = noise(4, () => {
    const pop = Math.random() < 0.0009 ? (Math.random() - 0.5) * 1.6 : 0
    return (Math.random() - 0.5) * 0.05 + pop
  })
  crackle = play(buf, 0.22, f => {
    f.type = 'lowpass'
    f.frequency.value = 5200
  })
  crackle.loop = true
}

function stopCrackle() {
  crackle?.stop()
  crackle = null
}

export const sound = {
  get enabled() {
    return enabled
  },
  setEnabled(on: boolean) {
    enabled = on
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off')
    } catch {
      // private mode: the toggle still works for this visit
    }
    if (on) {
      audio()
      startCrackle()
    } else stopCrackle()
  },
  // call from any user gesture so a remembered "on" can start the audio context
  unlock() {
    if (enabled) {
      audio()
      startCrackle()
    }
  },
  // wood sliding on wood
  drawer(out: boolean) {
    if (!enabled || !ctx) return
    const buf = noise(0.45, (i, n) => (Math.random() - 0.5) * Math.sin((Math.PI * i) / n) ** 1.5)
    play(buf, 0.5, (f, t) => {
      f.type = 'bandpass'
      f.Q.value = 1.4
      f.frequency.setValueAtTime(out ? 380 : 700, t)
      f.frequency.linearRampToValueAtTime(out ? 700 : 380, t + 0.45)
    })
    if (!out) setTimeout(() => enabled && thump(90, 0.12, 0.35), 420)
  },
  // needle meets record: a soft thump and a burst of crackle
  needle() {
    if (!enabled || !ctx) return
    thump(70, 0.18, 0.45)
    const buf = noise(0.35, (i, n) => (Math.random() - 0.5) * (1 - i / n) * (Math.random() < 0.02 ? 1.5 : 0.15))
    play(buf, 0.5, f => {
      f.type = 'highpass'
      f.frequency.value = 900
    })
  },
  // a record is on the turntable: keep the surface noise going while sound is on
  spinning(on: boolean) {
    wantCrackle = on
    if (on) startCrackle()
    else stopCrackle()
  },
  // the lamp's switch
  click() {
    if (!enabled || !ctx) return
    const buf = noise(0.03, (i, n) => (Math.random() - 0.5) * (1 - i / n))
    play(buf, 0.6, f => {
      f.type = 'highpass'
      f.frequency.value = 2500
    })
  },
}
