import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, Sparkles } from '@react-three/drei'
import albumArt from 'album-art'
import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import * as THREE from 'three'
import type { Cover } from './covers'
import { allRecords, drawers, profile, shelves, type Album, type CoverId } from './data'
import { sound } from './sound'
import { stage } from './stage'
import { dossierTexture, labelTexture, photoPlaceholder, photoTexture, shadowTexture, vinylTexture, woodTexture } from './textures'

// Desk dimensions in metres-ish scene units.
const W = 3.2
const H = 1.5
const D = 1.5
const LEG = 0.36
const SURFACE = H / 2 + 0.08
const DRAWER_H = 0.42
const DRAWER_Y = [0.48, 0, -0.48]
const FRONT = D / 2
const REC = 0.82
const PULL = 0.95 // how far a drawer slides out
const PHOTO = [0.36, 0.48] as const
// drawer label plate: as large as fits between the pull and the drawer's top edge, so it reads from the front view
const LABEL = [1.6, 0.24] as const
// the wall shelves: how far behind the desk they hang, and the size of their albums
const WALL = 2.5
const SHELF_REC = 0.55
// Table-top layout: [x across the desk, z from the back (-) to the front (+)]. The speaker sits low at the front left
// so the photo, standing behind it, still shows above it.
const LAYOUT = { frame: [-1.25, -0.4], speaker: [-1.2, 0.3], deck: -0.29, file: 0.88 } as const
// Turntable, in its own space: platter centre, tonearm pivot, and how far the arm swings to reach the record.
const DECK = { px: -0.13, pz: 0.02, pivot: [0.42, 0.15, -0.27] as const, swing: 0.53 }
// how far the table top tips towards the camera (radians from upright): the opening view, and again while an album
// is open
const TOP_FRONT = 0.78
const UP = new THREE.Vector3(0, 1, 0)
const { lerp, clamp, smoothstep, damp } = THREE.MathUtils

type Props = {
  covers: Map<CoverId, Cover>
  onRecord: (id: CoverId) => void
  onDrawer: (i: number) => void
  onFile: () => void
  paused?: boolean
}
type Mats = ReturnType<typeof useMaterials>
type Vinyls = Map<CoverId, THREE.Material[]>

// Each sleeve's disc, so the turntable can start a record's flight exactly where its disc is.
const discs = new Map<CoverId, THREE.Object3D>()

// While an album is open the camera looks down onto the table top, so the crate is put away first: records go back
// into their drawer during the first half of stage.album and the drawer shuts during the second half (the reverse on
// the way back), so a record is never outside a drawer that is moving and nothing stands in front of the turntable.
type DrawerState = (typeof stage.drawers)[number]
const riseOf = (s: DrawerState) => s.rise * (1 - smoothstep(stage.album, 0, 0.5))
const openOf = (s: DrawerState) => s.open * (1 - smoothstep(stage.album, 0.5, 1))

const hover = (id: string) => (e: ThreeEvent<PointerEvent>) => {
  e.stopPropagation()
  stage.hover = id
  document.body.style.cursor = 'pointer'
}
const unhover = (id: string) => () => {
  if (stage.hover === id) stage.hover = ''
  document.body.style.cursor = ''
}

export default function Stage(props: Props) {
  return (
    <Canvas
      className="stage"
      aria-hidden
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 9], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={props.paused ? 'never' : 'always'}
    >
      <ambientLight intensity={0.35} color="#ffe3c8" />
      <Lamp />
      <directionalLight position={[-5, 3, -4]} intensity={1.4} color="#a9b8ff" />
      <Environment resolution={256} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={3} color="#ffe2c0" position={[0, 4, 5]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#c8d4ff" position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffb877" position={[4, 2, 3]} scale={2} />
        {/* behind the camera, so flat brass facing the viewer still has something to reflect */}
        <Lightformer form="rect" intensity={1.4} color="#ffe6c8" position={[0, 0.5, 9]} scale={[12, 3, 1]} />
      </Environment>
      <Rig {...props} />
    </Canvas>
  )
}

// The desk lamp's key light; the intro flickers it on through stage.lamp.
function Lamp() {
  const light = useRef<THREE.SpotLight>(null!)
  useFrame(() => {
    light.current.intensity = 300 * stage.lamp
  })
  return (
    <spotLight
      ref={light}
      position={[3.5, 5, 8]}
      angle={0.45}
      penumbra={0.85}
      intensity={300}
      color="#ffd6a8"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0003}
      shadow-radius={6}
    />
  )
}

// Camera framing and desk orientation, all driven by `stage`.
function Rig(props: Props) {
  const outer = useRef<THREE.Group>(null!)
  const inner = useRef<THREE.Group>(null!)
  const shelf = useRef<THREE.Group[]>([])
  const look = useRef({ x: 0, y: 0 })
  const m = useMaterials()

  useFrame(({ camera, size, pointer }, dt) => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const portrait = aspect < 0.9
    const t = stage.turn
    const a = stage.album
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const fit = (w: number, h: number) => Math.max(h / 2 / tan, w / 2 / (tan * aspect))
    // the opening view frames the table top and what stands on it; the front view leaves room for records rising
    // above the desk
    const dTop = portrait ? fit(3.7, 3.4) : fit(5.4, 4)
    const dFront = portrait ? fit(3.9, 6.2) : fit(7.8, 4.4)
    const baseDist = lerp(dTop, dFront, t) + stage.outro * 1.2
    const visW = 2 * tan * aspect * baseDist
    const visH = 2 * tan * baseDist

    look.current.x = damp(look.current.x, pointer.x, 3, dt)
    look.current.y = damp(look.current.y, pointer.y, 3, dt)
    // top-front to start, the front for the drawers, and top-front again with an album open so the record is seen playing
    inner.current.rotation.x = lerp(lerp(TOP_FRONT, 0.16, t), TOP_FRONT, a) - look.current.y * 0.035
    // at the contact section the desk turns to face the card
    inner.current.rotation.y = look.current.x * 0.06 + stage.outro * (portrait ? 0.3 : 0.45)

    cam.position.set(0, 0, baseDist)
    cam.lookAt(0, 0, 0)
    // an open album window takes more room than a crate card: the desk shrinks and moves further aside, and with
    // the records put away it no longer needs the headroom above it
    outer.current.scale.setScalar(1 - a * (portrait ? 0.3 : 0.1))
    outer.current.position.x = portrait ? 0 : -(stage.shift * 0.17 + a * 0.07) * visW
    outer.current.position.y = portrait ? (stage.shift * 0.18 + a * 0.12) * visH - t * 0.3 : -t * 0.35 * (1 - a)
    // the wall shelves keep their place on screen in every view: the upper corners, or stacked above the desk on a
    // phone, where they slide off the top when a crate card pushes the desk up (no room for them and the records)
    const half = tan * (baseDist + WALL)
    shelf.current.forEach((s, i) => {
      if (portrait) s.position.set(0, half * (0.66 - i * 0.22 + stage.shift * 0.6), -WALL)
      else s.position.set((i ? 1 : -1) * half * aspect * 0.72, half * 0.62, -WALL)
      s.scale.setScalar(portrait ? 1.4 : 1)
    })
  })

  return (
    <group ref={outer}>
      {/* dust drifting down through the lamp beam; moves with the desk but doesn't tilt */}
      <Sparkles count={45} scale={[2.6, 3.6, 2]} position={[0, 1.3, 0.6]} size={4} speed={0.12} noise={0.3} opacity={0.5} color="#ffe2b8" />
      {/* outside the tilting group: they hang on the wall, not on the desk */}
      {shelves.map((albums, i) => (
        <Shelf key={i} ref={(g: THREE.Group) => void (shelf.current[i] = g)} albums={albums} m={m} />
      ))}
      <group ref={inner}>
        <Desk {...props} m={m} />
      </group>
    </group>
  )
}

function useMaterials() {
  return useMemo(() => {
    const front = woodTexture(3, [1, 0.14])
    return {
      top: new THREE.MeshPhysicalMaterial({ map: woodTexture(1, [1, 0.48]), roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
      body: new THREE.MeshStandardMaterial({ map: woodTexture(2, [1, 1]), roughness: 0.55 }),
      fronts: [0, 1, 2].map(i => {
        const map = front.clone()
        map.offset.y = i * 0.31
        return new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 })
      }),
      brass: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: '#d4d7da', metalness: 1, roughness: 0.22 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
      felt: new THREE.MeshStandardMaterial({ color: '#2a1810', roughness: 1 }),
      cavity: new THREE.MeshBasicMaterial({ color: '#060302' }),
      frame: new THREE.MeshPhysicalMaterial({ color: '#1b120c', roughness: 0.3, clearcoat: 1 }),
      manila: new THREE.MeshStandardMaterial({ color: '#d4ad6a', roughness: 0.85 }),
      sleeveEdge: new THREE.MeshStandardMaterial({ color: '#1d1712', roughness: 0.8 }),
      vinylEdge: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.35 }),
      shadow: shadowTexture(),
    }
  }, [])
}

function Desk(props: Props & { m: Mats }) {
  const { m } = props
  // one set of record faces, shared by each sleeve's disc and the turntable
  const vinyls: Vinyls = useMemo(
    () =>
      new Map(
        allRecords.map(r => {
          const face = new THREE.MeshStandardMaterial({ map: vinylTexture(r.label, r.coverTitle), roughness: 0.28, metalness: 0.1, transparent: true })
          return [r.id, [m.vinylEdge, face, face]]
        }),
      ),
    [m],
  )
  return (
    <group>
      {/* plain boxes for the wood: RoundedBox maps textures in world units, which tiles the grain into seams */}
      <mesh position-y={H / 2 + 0.04} material={m.top} castShadow receiveShadow>
        <boxGeometry args={[W + 0.16, 0.08, D + 0.12]} />
      </mesh>
      <mesh material={m.body} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* dark openings revealed when a drawer slides out */}
      {DRAWER_Y.map(y => (
        <mesh key={y} position={[0, y, FRONT + 0.001]} material={m.cavity}>
          <planeGeometry args={[W - 0.12, DRAWER_H + 0.02]} />
        </mesh>
      ))}
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <group key={`${sx}${sz}`} position={[sx * (W / 2 - 0.2), -H / 2 - LEG / 2, sz * (D / 2 - 0.2)]} rotation={[-sz * 0.08, 0, sx * 0.08]}>
            <mesh material={m.body} castShadow>
              <cylinderGeometry args={[0.05, 0.032, LEG, 20]} />
            </mesh>
            <mesh position-y={-LEG / 2 + 0.03} material={m.brass}>
              <cylinderGeometry args={[0.034, 0.033, 0.06, 20]} />
            </mesh>
          </group>
        )),
      )}
      <mesh position-y={-H / 2 - LEG - 0.01} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W + 1.6, D + 1.4]} />
        <meshBasicMaterial map={m.shadow} transparent depthWrite={false} />
      </mesh>
      {drawers.map((d, i) => (
        <Drawer key={d.id} index={i} label={d.name} m={m} onOpen={() => props.onDrawer(i)} />
      ))}
      {drawers.map((d, i) =>
        d.records.map((r, k) => (
          <Sleeve
            key={r.id}
            album={r}
            drawer={i}
            slot={k}
            count={d.records.length}
            cover={props.covers.get(r.id)!}
            vinyl={vinyls.get(r.id)!}
            m={m}
            onOpen={props.onRecord}
          />
        )),
      )}
      <TopProps m={m} vinyls={vinyls} onFile={props.onFile} />
    </group>
  )
}

// A walnut wall shelf on brass brackets, its albums leaning back against the wall.
function Shelf({ ref, albums, m }: { ref: Ref<THREE.Group>; albums: Album['after'][]; m: Mats }) {
  const step = SHELF_REC + 0.08
  const len = albums.length * step + 0.12
  return (
    <group ref={ref}>
      <mesh position-y={-0.025} material={m.body}>
        <boxGeometry args={[len, 0.05, 0.3]} />
      </mesh>
      {[-1, 1].map(s => (
        <group key={s} position-x={s * len * 0.32}>
          <mesh position={[0, -0.0625, 0]} material={m.brass}>
            <boxGeometry args={[0.025, 0.025, 0.28]} />
          </mesh>
          <mesh position={[0, -0.13, -0.135]} material={m.brass}>
            <boxGeometry args={[0.025, 0.16, 0.025]} />
          </mesh>
        </group>
      ))}
      {albums.map((a, i) => (
        <group key={a.album} position={[(i - (albums.length - 1) / 2) * step, SHELF_REC / 2, -0.04]} rotation-x={-0.1}>
          <mesh material={m.sleeveEdge}>
            <boxGeometry args={[SHELF_REC, SHELF_REC, 0.012]} />
          </mesh>
          <ShelfCover after={a} />
        </group>
      ))}
    </group>
  )
}

// The album's real cover, fetched with album-art. Decoration only, so if the lookup fails the sleeve stays plain.
function ShelfCover({ after }: { after: Album['after'] }) {
  const [cover, setCover] = useState<THREE.Texture>()
  useEffect(() => {
    let live = true
    albumArt(after.artist, { album: after.album, size: 'medium' })
      .then(url => new THREE.TextureLoader().loadAsync(url))
      .then(t => {
        t.colorSpace = THREE.SRGBColorSpace
        if (live) setCover(t)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [after.artist, after.album])
  if (!cover) return null
  return (
    <mesh position-z={0.0061}>
      <planeGeometry args={[SHELF_REC, SHELF_REC]} />
      <meshStandardMaterial map={cover} roughness={0.55} />
    </mesh>
  )
}

function Drawer({ index, label, m, onOpen }: { index: number; label: string; m: Mats; onOpen: () => void }) {
  const g = useRef<THREE.Group>(null!)
  const peek = useRef(0)
  const motion = useRef({ prev: 0, moving: false, still: 0 })
  const card = useMemo(() => labelTexture(label), [label])
  const id = `drawer-${index}`
  const iw = W - 0.3
  const ih = DRAWER_H - 0.06
  const idp = D - 0.1

  useFrame((_, dt) => {
    const open = openOf(stage.drawers[index])
    // a closed drawer slides out a touch under the pointer, inviting the click
    peek.current = damp(peek.current, stage.hover === id && open < 0.05 ? 0.07 : 0, 10, dt)
    g.current.position.z = open * PULL + peek.current
    // one slide sound each time the drawer starts moving
    const mo = motion.current
    const v = open - mo.prev
    mo.prev = open
    if (Math.abs(v) > 0.003) {
      if (!mo.moving) sound.drawer(v > 0)
      mo.moving = true
      mo.still = 0
    } else if (mo.moving && ++mo.still > 8) mo.moving = false
  })

  return (
    <group ref={g} position={[0, DRAWER_Y[index], 0]}>
      <mesh
        position-z={FRONT + 0.03}
        material={m.fronts[index]}
        castShadow
        receiveShadow
        onPointerOver={hover(id)}
        onPointerOut={unhover(id)}
        onClick={e => {
          e.stopPropagation()
          onOpen()
        }}
      >
        <boxGeometry args={[W - 0.14, DRAWER_H, 0.06]} />
      </mesh>
      <mesh position-y={-ih / 2} material={m.felt} receiveShadow>
        <boxGeometry args={[iw, 0.02, idp]} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position-x={(s * iw) / 2} material={m.body}>
          <boxGeometry args={[0.025, ih, idp]} />
        </mesh>
      ))}
      <mesh position-z={-idp / 2} material={m.body}>
        <boxGeometry args={[iw, ih, 0.025]} />
      </mesh>
      {/* card-catalogue label holder */}
      <group position={[0, 0.048, FRONT + 0.062]}>
        <mesh>
          <planeGeometry args={LABEL} />
          <meshStandardMaterial map={card} roughness={0.85} />
        </mesh>
        {[
          [0, LABEL[1] / 2 + 0.009, LABEL[0] + 0.06, 0.018],
          [0, -LABEL[1] / 2 - 0.009, LABEL[0] + 0.06, 0.018],
          [-LABEL[0] / 2 - 0.021, 0, 0.018, LABEL[1] + 0.035],
          [LABEL[0] / 2 + 0.021, 0, 0.018, LABEL[1] + 0.035],
        ].map(([x, y, w, h]) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.004]} material={m.brass} castShadow>
            <boxGeometry args={[w, h, 0.012]} />
          </mesh>
        ))}
      </group>
      <group position={[0, -0.13, FRONT + 0.06]}>
        <mesh position-z={0.055} rotation-z={Math.PI / 2} material={m.brass} castShadow>
          <cylinderGeometry args={[0.016, 0.016, 0.5, 20]} />
        </mesh>
        {[-0.21, 0.21].map(x => (
          <mesh key={x} position={[x, 0, 0.028]} rotation-x={Math.PI / 2} material={m.brass}>
            <cylinderGeometry args={[0.012, 0.014, 0.056, 14]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// A record sleeve: lies flat in its drawer, then rises to stand above the desk facing the camera.
function Sleeve({
  album,
  drawer,
  slot,
  count,
  cover,
  vinyl,
  m,
  onOpen,
}: {
  album: Album
  drawer: number
  slot: number
  count: number
  cover: Cover
  vinyl: THREE.Material[]
  m: Mats
  onOpen: (id: CoverId) => void
}) {
  const g = useRef<THREE.Group>(null!)
  const disc = useRef<THREE.Mesh>(null!)
  const lift = useRef(0)
  const risen = useRef(false)
  const mats = useMemo(() => {
    const t = new THREE.CanvasTexture(cover.full)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    const front = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 })
    return [m.sleeveEdge, m.sleeveEdge, m.sleeveEdge, m.sleeveEdge, front, m.sleeveEdge]
  }, [cover, m])
  const center = slot - (count - 1) / 2
  const x = center * (count === 3 ? 0.95 : 1.05)
  useEffect(() => {
    discs.set(album.id, disc.current)
    return () => {
      discs.delete(album.id)
    }
  }, [album.id])

  useFrame((_, dt) => {
    const s = stage.drawers[drawer]
    const open = openOf(s)
    const lag = 0.18
    const t = clamp((riseOf(s) - slot * lag) / (1 - lag * (count - 1)), 0, 1)
    // Three steps so the sleeve never passes through wood (the timeline only moves it once the drawer is fully out):
    // a) lift flat until it clears the open drawer's front edge, b) slide forward over that front, past the pulls
    // above, c) rise and stand up. Rising eases out while turning eases in, so the swinging bottom edge stays high.
    const a = smoothstep(t, 0, 0.3)
    const b = smoothstep(t, 0.3, 0.5)
    const c = smoothstep(t, 0.5, 1)
    risen.current = t > 0.95
    lift.current = damp(lift.current, stage.hover === album.id && risen.current ? 1 : 0, 9, dt)
    const h = lift.current
    const inY = DRAWER_Y[drawer] - (DRAWER_H - 0.06) / 2 + 0.02
    const clearY = DRAWER_Y[drawer] + DRAWER_H / 2 + 0.05
    const outY = SURFACE + REC / 2 + 0.2
    g.current.visible = open > 0.02
    g.current.position.set(
      x * lerp(0.92, 1, c),
      lerp(inY, clearY, a) + (outY - clearY) * (1 - (1 - c) ** 2) + h * 0.06,
      // in the drawer its front edge sits just behind the drawer front; 1.4 puts its back edge past the pulls above
      lerp(open * PULL + 0.32, 1.4, b) + (FRONT + 0.45 - 1.4) * c + h * 0.08,
    )
    g.current.rotation.set(lerp(-Math.PI / 2, -0.12, c * c), -x * 0.07 * c, -center * 0.035 * c)
    // the disc is on the turntable while this record plays
    disc.current.visible = stage.deck.id !== album.id
    disc.current.position.x = h * 0.36
    disc.current.rotation.y -= dt * (0.4 + h * 2.2)
  })

  return (
    <group ref={g}>
      <mesh
        material={mats}
        castShadow
        onPointerOver={e => risen.current && hover(album.id)(e)}
        onPointerOut={unhover(album.id)}
        onClick={e => {
          if (!risen.current) return
          e.stopPropagation()
          onOpen(album.id)
        }}
      >
        <boxGeometry args={[REC, REC, 0.014]} />
      </mesh>
      <mesh ref={disc} position-z={-0.001} rotation-x={Math.PI / 2} material={vinyl} castShadow>
        <cylinderGeometry args={[0.39, 0.39, 0.008, 72]} />
      </mesh>
    </group>
  )
}

// The record player. stage.deck says which record is on it: when that changes, the record flies from its sleeve's
// disc (wherever that is on screen) onto the platter as deck.drop goes 0→1, then the arm swings over as deck.arm goes 0→1.
function Turntable({ m, vinyls }: { m: Mats; vinyls: Vinyls }) {
  const root = useRef<THREE.Group>(null!)
  const disc = useRef<THREE.Mesh>(null!)
  const platter = useRef<THREE.Group>(null!)
  const arm = useRef<THREE.Group>(null!)
  const shown = useRef('')
  const spin = useRef(0)
  const v = useMemo(
    () => ({
      fromP: new THREE.Vector3(),
      fromQ: new THREE.Quaternion(),
      rootQ: new THREE.Quaternion(),
      flat: new THREE.Quaternion(),
      onPlatter: new THREE.Vector3(DECK.px, 0.118, DECK.pz),
    }),
    [],
  )
  useEffect(() => {
    arm.current.rotation.order = 'YXZ' // swing about the pivot, lift along the arm
  }, [])

  useFrame((_, dt) => {
    const d = stage.deck
    if (d.id !== shown.current) {
      shown.current = d.id
      const src = d.id ? discs.get(d.id) : undefined
      if (d.id && src) {
        // start where the sleeve's own disc is, converted into turntable space
        root.current.updateWorldMatrix(true, false) // the desk may have moved this frame
        src.getWorldPosition(v.fromP)
        root.current.worldToLocal(v.fromP)
        src.getWorldQuaternion(v.fromQ)
        root.current.getWorldQuaternion(v.rootQ)
        v.fromQ.premultiply(v.rootQ.invert())
        disc.current.material = vinyls.get(d.id)!
      }
      sound.spinning(!!d.id)
    }
    const on = !!d.id
    disc.current.visible = on
    if (on && d.drop > 0.99) spin.current += dt * 3.5 // 33⅓ rpm
    platter.current.rotation.y = spin.current
    if (on) {
      const t = d.drop
      disc.current.position.lerpVectors(v.fromP, v.onPlatter, t)
      disc.current.position.y += Math.sin(t * Math.PI) * 0.35
      v.flat.setFromAxisAngle(UP, spin.current)
      disc.current.quaternion.slerpQuaternions(v.fromQ, v.flat, t)
      disc.current.scale.setScalar(lerp(1, 0.92, t))
    }
    // swing across to the record, lifting a little on the way
    arm.current.rotation.set(-0.09 * Math.sin(Math.PI * d.arm), -DECK.swing * d.arm, 0)
  })

  const [ax, ay, az] = DECK.pivot
  return (
    <group ref={root}>
      <RoundedBox args={[1.15, 0.08, 0.86]} radius={0.02} smoothness={3} position-y={0.04} material={m.frame} castShadow receiveShadow />
      <group ref={platter} position={[DECK.px, 0.095, DECK.pz]}>
        <mesh material={m.steel} castShadow receiveShadow>
          <cylinderGeometry args={[0.37, 0.37, 0.03, 72]} />
        </mesh>
        <mesh position-y={0.017} material={m.rubber} receiveShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.004, 72]} />
        </mesh>
        <mesh position-y={0.03} material={m.steel}>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
        </mesh>
      </group>
      <mesh ref={disc} material={m.vinylEdge} castShadow visible={false}>
        <cylinderGeometry args={[0.39, 0.39, 0.008, 72]} />
      </mesh>
      {/* tonearm: base, the arm itself, its rest post, and a speed knob */}
      <mesh position={[ax, 0.105, az]} material={m.steel} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.05, 32]} />
      </mesh>
      <group ref={arm} position={[ax, ay, az]}>
        <mesh position-z={0.29} rotation-x={Math.PI / 2} material={m.steel} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.58, 12]} />
        </mesh>
        <mesh position={[0, -0.014, 0.58]} material={m.steel} castShadow>
          <boxGeometry args={[0.05, 0.012, 0.07]} />
        </mesh>
        <mesh position={[0, -0.024, 0.585]} material={m.rubber}>
          <boxGeometry args={[0.022, 0.012, 0.03]} />
        </mesh>
        <mesh position-z={-0.1} rotation-x={Math.PI / 2} material={m.steel} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 24]} />
        </mesh>
      </group>
      <mesh position={[ax, 0.11, az + 0.45]} material={m.steel}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 10]} />
      </mesh>
      <mesh position={[-0.47, 0.09, 0.33]} material={m.brass}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
      </mesh>
    </group>
  )
}

// The photo frame, the turntable and the artist file on the table top.
function TopProps({ m, vinyls, onFile }: { m: Mats; vinyls: Vinyls; onFile: () => void }) {
  const file = useRef<THREE.Group>(null!)
  const lift = useRef(0)
  const dossier = useMemo(dossierTexture, [])
  const [photo, setPhoto] = useState<THREE.Texture>(photoPlaceholder)
  useEffect(() => photoTexture(profile.photo, PHOTO[0] / PHOTO[1], setPhoto), [])

  useFrame((_, dt) => {
    lift.current = damp(lift.current, stage.hover === 'file' && stage.turn < 0.2 ? 1 : 0, 10, dt)
    file.current.position.y = lift.current * 0.03
  })

  return (
    <group position-y={SURFACE}>
      {/* the photo, standing on an easel back behind the speaker */}
      <group position={[LAYOUT.frame[0], 0, LAYOUT.frame[1]]} rotation-y={0.2}>
        <group position-y={0.31} rotation-x={-0.2}>
          <RoundedBox args={[0.5, 0.62, 0.04]} radius={0.012} smoothness={3} material={m.frame} castShadow receiveShadow />
          <mesh position-z={0.021} receiveShadow>
            <planeGeometry args={[0.42, 0.54]} />
            <meshStandardMaterial color="#ece2cf" roughness={0.9} />
          </mesh>
          <mesh position-z={0.022}>
            <planeGeometry args={PHOTO} />
            <meshStandardMaterial map={photo} roughness={0.6} />
          </mesh>
          <mesh position-z={0.024}>
            <planeGeometry args={[0.44, 0.56]} />
            <meshPhysicalMaterial transparent opacity={0.1} roughness={0.04} clearcoat={1} color="#ffffff" />
          </mesh>
        </group>
        <mesh position={[0, 0.17, -0.13]} rotation-x={0.42} material={m.frame} castShadow>
          <boxGeometry args={[0.04, 0.38, 0.02]} />
        </mesh>
      </group>
      <group position={[LAYOUT.speaker[0], 0, LAYOUT.speaker[1]]} rotation-y={0.28}>
        <Speaker m={m} />
      </group>
      <group position-x={LAYOUT.deck}>
        <Turntable m={m} vinyls={vinyls} />
      </group>
      <group position={[LAYOUT.file, 0, 0.02]} rotation-y={-0.035}>
        <group
          ref={file}
          onPointerOver={e => stage.turn < 0.2 && hover('file')(e)}
          onPointerOut={unhover('file')}
          onClick={e => {
            if (stage.turn > 0.2) return
            e.stopPropagation()
            onFile()
          }}
        >
          <mesh position-y={0.005} material={m.manila} castShadow receiveShadow>
            <boxGeometry args={[1.04, 0.01, 1.34]} />
          </mesh>
          <mesh position={[-0.26, 0.005, -0.7]} material={m.manila}>
            <boxGeometry args={[0.34, 0.01, 0.08]} />
          </mesh>
          <mesh position-y={0.0115} rotation={[-Math.PI / 2, 0, 0.02]} receiveShadow>
            <planeGeometry args={[0.92, 1.22]} />
            <meshStandardMaterial map={dossier} roughness={0.92} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// A low mid-century speaker: walnut cabinet, an exposed woofer in a brass ring, a tweeter, a volume knob and a pilot
// light. It is where the record's music comes out, so the woofer pumps with the music and the light is on while it
// plays.
function Speaker({ m }: { m: Mats }) {
  const cone = useRef<THREE.Group>(null!)
  const pilot = useRef<THREE.MeshStandardMaterial>(null!)
  const pump = useRef(0)
  useFrame((_, dt) => {
    pump.current = damp(pump.current, sound.level(), 20, dt)
    cone.current.position.z = 0.142 + pump.current * 0.02
    pilot.current.emissiveIntensity = sound.playing ? 2.2 : 0
  })
  const front = 0.14 // the cabinet's front face, from its centre
  return (
    <group position-y={0.2}>
      <RoundedBox args={[0.6, 0.36, 0.28]} radius={0.03} smoothness={3} material={m.fronts[1]} castShadow receiveShadow />
      <mesh position={[0, 0, front + 0.001]}>
        <planeGeometry args={[0.54, 0.3]} />
        <meshStandardMaterial color="#17110c" roughness={0.9} />
      </mesh>
      <group position={[-0.11, 0.005, 0]}>
        <mesh position-z={front + 0.006} material={m.brass}>
          <torusGeometry args={[0.122, 0.009, 12, 48]} />
        </mesh>
        <mesh position-z={front + 0.004} rotation-x={Math.PI / 2} material={m.rubber}>
          <cylinderGeometry args={[0.116, 0.116, 0.006, 48]} />
        </mesh>
        <group ref={cone}>
          <mesh rotation-x={-Math.PI / 2}>
            <coneGeometry args={[0.1, 0.035, 48, 1, true]} />
            <meshStandardMaterial color="#1c1a19" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position-z={-0.012} scale-z={0.5}>
            <sphereGeometry args={[0.034, 24, 12]} />
            <meshStandardMaterial color="#2a2624" roughness={0.6} />
          </mesh>
        </group>
      </group>
      <group position={[0.17, 0.07, front + 0.004]}>
        <mesh material={m.brass}>
          <torusGeometry args={[0.04, 0.006, 10, 32]} />
        </mesh>
        <mesh scale-z={0.45}>
          <sphereGeometry args={[0.033, 20, 10]} />
          <meshStandardMaterial color="#141210" roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[0.17, -0.08, front + 0.012]} rotation-x={Math.PI / 2} material={m.brass} castShadow>
        <cylinderGeometry args={[0.028, 0.03, 0.022, 24]} />
      </mesh>
      <mesh position={[0.24, -0.08, front + 0.004]}>
        <sphereGeometry args={[0.008, 10, 8]} />
        <meshStandardMaterial ref={pilot} color="#3a1a06" emissive="#ffa040" emissiveIntensity={0} />
      </mesh>
    </group>
  )
}
