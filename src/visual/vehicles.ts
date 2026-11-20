import * as THREE from 'three'
import { VISUAL, boosterEngineLayout, shipEngineLayout, type Measured } from './dimensions'

export interface VehicleRig {
  /** Origin sits at the bottom of the tank section, y up. */
  group: THREE.Group
  height: number
  engines: THREE.Object3D[]
  plumes: THREE.Mesh[]
  gridFins: THREE.Object3D[]
  bodies: THREE.Mesh[]
  /** Light the first `n` engines. */
  setEngines(n: number): void
  /** Flicker, call every frame. */
  tick(seconds: number): void
}

function panelTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 1024
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = '#c4cacd'
  g.fillRect(0, 0, 256, 1024)
  // slight brushed grain
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * 0.06
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    g.fillRect(Math.random() * 256, Math.random() * 1024, 1 + Math.random() * 60, 1)
  }
  // weld lines every barrel section
  g.fillStyle = 'rgba(40,48,54,0.55)'
  for (let y = 0; y < 1024; y += 64) g.fillRect(0, y, 256, 2)
  g.fillStyle = 'rgba(40,48,54,0.22)'
  for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 1, 1024)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

const steel = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0xdfe5e8,
    map: panelTexture(),
    metalness: 0.92,
    roughness: 0.34,
  })
const darkSteel = () => new THREE.MeshStandardMaterial({ color: 0x23282c, metalness: 0.8, roughness: 0.55 })
const tiles = () => new THREE.MeshStandardMaterial({ color: 0x0d0e10, metalness: 0.2, roughness: 0.85 })
const bellMat = () => new THREE.MeshStandardMaterial({ color: 0x5a5f63, metalness: 0.95, roughness: 0.4 })

const plumeGeometry = (() => {
  const g = new THREE.ConeGeometry(0.62, 1, 14, 1, true)
  g.rotateX(Math.PI)
  g.translate(0, -0.5, 0)
  return g
})()

function plumeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying float vT;
      void main() {
        vT = clamp(-position.y, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vT;
      void main() {
        vec3 hot = vec3(1.0, 0.92, 0.78);
        vec3 cool = vec3(1.0, 0.36, 0.08);
        vec3 c = mix(hot, cool, smoothstep(0.0, 0.7, vT));
        float a = (1.0 - vT) * 0.85;
        gl_FragColor = vec4(c, a * a + 0.04);
      }`,
  })
}

function bell(radiusBottom: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusBottom * 0.55, radiusBottom, VISUAL.raptorHeight, 16, 1, true),
    bellMat(),
  )
  m.userData.part = 'engine'
  return m
}

function addEngines(
  rig: { group: THREE.Group; engines: THREE.Object3D[]; plumes: THREE.Mesh[] },
  layout: { x: number; z: number; r?: number }[],
  plumeLength: number,
  plumeMat: THREE.ShaderMaterial,
) {
  for (const p of layout) {
    const radius = p.r ?? VISUAL.bellRadius
    const e = bell(radius)
    e.position.set(p.x, 0.2, p.z)
    rig.group.add(e)
    rig.engines.push(e)
    const f = new THREE.Mesh(plumeGeometry, plumeMat)
    f.position.set(p.x, 0.2 - VISUAL.raptorHeight / 2 + 0.1, p.z)
    f.scale.set(radius / 0.62 * 1.0, plumeLength, radius / 0.62 * 1.0)
    f.userData.baseLength = plumeLength
    f.userData.part = 'plume'
    f.visible = false
    rig.group.add(f)
    rig.plumes.push(f)
  }
}

function gridFin(): THREE.Group {
  const fin = new THREE.Group()
  const mat = darkSteel()
  const w = 2.8
  const h = 3.4
  const t = 0.3
  const frame: [number, number, number, number, number][] = [
    [0, h / 2, w, t, 0.5],
    [0, -h / 2, w, t, 0.5],
    [w / 2, 0, t, h, 0.5],
    [-w / 2, 0, t, h, 0.5],
  ]
  for (const [x, y, sx, sy, sz] of frame) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)
    m.position.set(x, y, 0)
    fin.add(m)
  }
  for (let i = -2; i <= 2; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.4), mat)
    m.position.set((i * w) / 6, 0, 0)
    fin.add(m)
  }
  for (let i = -1; i <= 1; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.4), mat)
    m.position.set(0, (i * h) / 4, 0)
    fin.add(m)
  }
  return fin
}

function finish(rig: VehicleRig): VehicleRig {
  rig.setEngines = (n: number) => {
    rig.plumes.forEach((p, i) => (p.visible = i < n))
  }
  rig.tick = (s: number) => {
    rig.plumes.forEach((p, i) => {
      if (!p.visible) return
      const k = 0.92 + 0.08 * Math.sin(s * 38 + i * 1.7) + 0.04 * Math.sin(s * 91 + i)
      p.scale.y = (p.userData.baseLength as number) * k
    })
  }
  return rig
}

export function buildBooster(m: Measured): VehicleRig {
  const R = m.diameter / 2
  const H = m.boosterHeight
  const rig: VehicleRig = {
    group: new THREE.Group(),
    height: H,
    engines: [],
    plumes: [],
    gridFins: [],
    bodies: [],
    setEngines: () => {},
    tick: () => {},
  }
  rig.group.name = 'booster'
  const pts: THREE.Vector2[] = []
  const steps = 24
  for (let i = 0; i <= steps; i++) pts.push(new THREE.Vector2(R, (H * i) / steps))
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), steel())
  ;(body.material as THREE.MeshStandardMaterial).map?.repeat.set(1, 3)
  body.castShadow = true
  body.receiveShadow = true
  body.userData.part = 'body'
  rig.group.add(body)
  rig.bodies.push(body)

  // hot-stage ring: dark band at the top, inside the 72 m
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.04, 2.2, 56, 1, true), darkSteel())
  ring.position.y = H - 1.1
  ring.userData.part = 'detail'
  rig.group.add(ring)

  // three grid fins, 120 degrees apart (V3)
  const finY = H - 6.5
  for (let i = 0; i < m.boosterGridFins; i++) {
    const a = Math.PI / 2 + (i / m.boosterGridFins) * Math.PI * 2
    const holder = new THREE.Group()
    holder.position.set(Math.cos(a) * (R + 1.6), finY, Math.sin(a) * (R + 1.6))
    holder.rotation.y = -a + Math.PI / 2
    const fin = gridFin()
    holder.add(fin)
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.8), darkSteel())
    strut.position.set(0, 0, 0.9)
    holder.add(strut)
    holder.userData.part = 'gridfin'
    holder.traverse((o) => (o.castShadow = true))
    rig.group.add(holder)
    rig.gridFins.push(holder)
  }

  // skirt plate with 33 engines
  const layout = boosterEngineLayout(m)
  addEngines(rig, layout, 16, plumeMaterial())
  return finish(rig)
}

export function buildShip(m: Measured): VehicleRig {
  const R = m.diameter / 2
  const H = m.shipHeight
  const L = VISUAL.shipNoseLength
  const rig: VehicleRig = {
    group: new THREE.Group(),
    height: H,
    engines: [],
    plumes: [],
    gridFins: [],
    bodies: [],
    setEngines: () => {},
    tick: () => {},
  }
  rig.group.name = 'ship'
  const profile = (scale: number) => {
    const pts: THREE.Vector2[] = []
    const cyl = H - L
    for (let i = 0; i <= 14; i++) pts.push(new THREE.Vector2(R * scale, (cyl * i) / 14))
    for (let i = 1; i <= 16; i++) {
      const s = i / 16
      pts.push(new THREE.Vector2(R * scale * Math.pow(1 - s * s, 0.62), cyl + L * s))
    }
    pts[pts.length - 1].set(0, H)
    return pts
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile(1), 56), steel())
  ;(body.material as THREE.MeshStandardMaterial).map?.repeat.set(1, 3)
  body.castShadow = true
  body.receiveShadow = true
  body.userData.part = 'body'
  rig.group.add(body)
  rig.bodies.push(body)

  // black heat-shield tiles on the windward side (+x)
  const phi = THREE.MathUtils.degToRad(130)
  const shield = new THREE.Mesh(new THREE.LatheGeometry(profile(1.003), 40, Math.PI / 2 - phi / 2, phi), tiles())
  shield.userData.part = 'detail'
  rig.group.add(shield)

  // decorative flaps (schematic): two forward, two aft
  const flapMat = tiles()
  const flap = (w: number, h: number, y: number, side: number) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, w), flapMat)
    f.position.set(side * (R + 0.35), y, 0.9)
    f.rotation.z = side * 0.0
    f.userData.part = 'detail'
    f.castShadow = true
    rig.group.add(f)
  }
  flap(2.8, 6.5, H - 12, 1)
  flap(2.8, 6.5, H - 12, -1)
  flap(4.2, 9, 6.5, 1)
  flap(4.2, 9, 6.5, -1)

  const layout = shipEngineLayout(m).map((e) => ({ x: e.x, z: e.z, r: e.kind === 'vac' ? VISUAL.vacBellRadius : VISUAL.bellRadius }))
  addEngines(rig, layout, 11, plumeMaterial())
  return finish(rig)
}
