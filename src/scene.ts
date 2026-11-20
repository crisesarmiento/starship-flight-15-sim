import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { flight, type Frame } from './visual/core'
import { VISUAL, measuredFrom } from './visual/dimensions'
import { buildMap, type Anchor } from './visual/mapView'
import { CATCH_PIN_OFFSET, STACK_BASE_Y, SUN_DIR, buildGround, buildMount, buildSky, buildTower } from './visual/site'
import { buildBooster, buildShip } from './visual/vehicles'

export type ViewMode = 'pad' | 'map'

/** What the pad-scale view is showing right now. */
export type PadState = 'stack' | 'landing' | 'caught' | 'away'

export interface ProjectedLabel {
  id: string
  text: string
  kind: Anchor['kind'] | 'dim'
  x: number
  y: number
  visible: boolean
  /** event not reached yet */
  dim: boolean
  align: 'top' | 'right'
}

export interface SceneApi {
  readonly view: ViewMode
  readonly padState: PadState
  setView(v: ViewMode): void
  resetCamera(): void
  render(frame: Frame, dtReal: number): void
  labels(frame: Frame): ProjectedLabel[]
  resize(): void
  dispose(): void
}

function time(id: string): number {
  const e = flight.timeline.find((x) => x.id === id)
  if (!e) throw new Error(`Falta el evento ${id} en la línea de tiempo`)
  return e.t_sec
}

export function createScene(host: HTMLElement): SceneApi {
  const m = measuredFrom(flight)
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'stage-canvas'
  host.appendChild(renderer.domElement)

  // ---------- pad scene (to scale, metres)
  const padScene = new THREE.Scene()
  padScene.fog = new THREE.FogExp2(0xe0b992, 2.6e-5)
  const pmrem = new THREE.PMREMGenerator(renderer)
  padScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  padScene.environmentIntensity = 0.45
  padScene.add(buildSky(), buildGround(), buildMount())
  const tower = buildTower()
  padScene.add(tower.group)

  const hemi = new THREE.HemisphereLight(0xb7cdf0, 0x6d6246, 0.55)
  padScene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffd7a6, 3.1)
  sun.position.copy(SUN_DIR).multiplyScalar(700).add(new THREE.Vector3(0, 60, 0))
  sun.target.position.set(0, 60, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  const sc = sun.shadow.camera
  sc.left = -190
  sc.right = 190
  sc.top = 190
  sc.bottom = -190
  sc.near = 100
  sc.far = 1400
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.6
  padScene.add(sun, sun.target)

  // vehicles
  const booster = buildBooster(m)
  const ship = buildShip(m)
  const stack = new THREE.Group()
  stack.add(booster.group)
  padScene.add(stack, ship.group)
  ship.group.visible = false

  // dimension lines (official numbers read from data), they follow the stack
  const dim = new THREE.Group()
  const dimPts: number[] = []
  const seg = (a: [number, number, number], b: [number, number, number]) => dimPts.push(...a, ...b)
  const dx = 9.5
  const tick = 1.4
  for (const [y0, y1] of [
    [0, m.boosterHeight],
    [m.boosterHeight, m.stackHeight],
  ]) {
    seg([dx, y0, 0], [dx, y1, 0])
    seg([dx - tick, y0, 0], [dx + tick, y0, 0])
    seg([dx - tick, y1, 0], [dx + tick, y1, 0])
  }
  const dx2 = 15.5
  seg([dx2, 0, 0], [dx2, m.stackHeight, 0])
  seg([dx2 - tick, 0, 0], [dx2 + tick, 0, 0])
  seg([dx2 - tick, m.stackHeight, 0], [dx2 + tick, m.stackHeight, 0])
  // diameter line under the booster, across the hull
  const dy = -4
  seg([-m.diameter / 2, dy, 0], [m.diameter / 2, dy, 0])
  seg([-m.diameter / 2, dy - tick, 0], [-m.diameter / 2, dy + tick, 0])
  seg([m.diameter / 2, dy - tick, 0], [m.diameter / 2, dy + tick, 0])
  const dimGeo = new THREE.BufferGeometry()
  dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(dimPts, 3))
  const dimLines = new THREE.LineSegments(dimGeo, new THREE.LineBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, depthTest: false }))
  dimLines.renderOrder = 6
  dim.add(dimLines)
  stack.add(dim)

  const padCam = new THREE.PerspectiveCamera(36, 1, 1, 900_000)
  const padDefault = { pos: new THREE.Vector3(-120, 96, 310), target: new THREE.Vector3(-14, 74, 0) }
  padCam.position.copy(padDefault.pos)
  const padCtl = new OrbitControls(padCam, renderer.domElement)
  padCtl.target.copy(padDefault.target)
  padCtl.enableDamping = true
  padCtl.dampingFactor = 0.08
  padCtl.minDistance = 25
  padCtl.maxDistance = 6000
  padCtl.maxPolarAngle = Math.PI * 0.495
  padCtl.update()

  // ---------- map scene (schematic)
  const mapScene = new THREE.Scene()
  mapScene.background = new THREE.Color(0x050b11)
  const map = buildMap(flight.timeline, flight.mission.orbit.orbits_approx.value ?? 14)
  mapScene.add(map.group)
  const mapCam = new THREE.PerspectiveCamera(38, 1, 1, 6000)
  const mapDefault = { pos: new THREE.Vector3(14, 345, 345), target: new THREE.Vector3(14, 0, 14) }
  mapCam.position.copy(mapDefault.pos)
  const mapCtl = new OrbitControls(mapCam, renderer.domElement)
  mapCtl.target.copy(mapDefault.target)
  mapCtl.enableDamping = true
  mapCtl.dampingFactor = 0.08
  mapCtl.minDistance = 40
  mapCtl.maxDistance = 1400
  mapCtl.maxPolarAngle = Math.PI * 0.47
  mapCtl.update()

  // ---------- state
  const t = {
    stage: time('hot_staging'),
    landing: time('ship_landing_burn_start'),
    catch: time('ship_catch'),
  }
  let view: ViewMode = 'pad'
  let padState: PadState = 'stack'
  let arms = 0
  let lastFollowY = STACK_BASE_Y
  mapCtl.enabled = false

  const padAnchors: { id: string; text: string; kind: ProjectedLabel['kind']; align?: 'top' | 'right'; at: () => THREE.Vector3 | null }[] = [
    { id: 'l-booster', align: 'right', text: `${m.boosterHeight} m`, kind: 'dim', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(dx + 2.2, m.boosterHeight / 2, 0)) : null) },
    { id: 'l-ship', align: 'right', text: `${m.shipHeight} m`, kind: 'dim', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(dx + 2.2, m.boosterHeight + m.shipHeight / 2, 0)) : null) },
    { id: 'l-stack', align: 'right', text: `Stack ${m.stackHeight} m`, kind: 'dim', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(dx2 + 2.2, m.stackHeight * 0.62, 0)) : null) },
    { id: 'l-dia', text: `Ø ${m.diameter} m`, kind: 'dim', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(0, -7.2, 0)) : null) },
    { id: 'l-bname', text: 'Super Heavy V3', kind: 'event', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(-13, m.boosterHeight * 0.3, 6)) : null) },
    { id: 'l-sname', text: 'Starship V3', kind: 'event', at: () => (padState === 'stack' ? stack.localToWorld(new THREE.Vector3(-13, m.boosterHeight + m.shipHeight * 0.55, 6)) : null) },
    { id: 'l-pad', text: 'Pad 2 · Starbase', kind: 'pad', at: () => new THREE.Vector3(30, 1, 36) },
    { id: 'l-tower', text: 'Torre de captura (esquemática)', kind: 'event', at: () => new THREE.Vector3(-46, VISUAL.towerHeight + 28, 0) },
    { id: 'l-gulf', text: 'Golfo de México', kind: 'region', at: () => new THREE.Vector3(VISUAL.coastEastM + 900, 4, 200) },
  ]

  function applyFrame(frame: Frame) {
    const alt = frame.altitudeM ?? 0
    const tt = frame.time
    if (tt < t.stage) {
      padState = 'stack'
      stack.visible = true
      stack.position.set(0, STACK_BASE_Y + alt, 0)
      if (!stack.children.includes(ship.group)) {
        ship.group.position.set(0, m.boosterHeight, 0)
        stack.add(ship.group)
      }
      ship.group.visible = true
      dim.visible = true
    } else {
      // ship leaves the stack at staging; it only comes back to the tower at the end
      if (stack.children.includes(ship.group)) {
        stack.remove(ship.group)
        padScene.add(ship.group)
      }
      stack.visible = false
      dim.visible = false
      if (tt >= t.catch) {
        padState = 'caught'
        ship.group.visible = true
        ship.group.position.set(0, VISUAL.catchHeight - CATCH_PIN_OFFSET, 0)
      } else if (tt >= t.landing) {
        padState = 'landing'
        ship.group.visible = true
        ship.group.position.set(0, VISUAL.catchHeight - CATCH_PIN_OFFSET + alt, 0)
      } else {
        padState = 'away'
        ship.group.visible = false
      }
    }
    booster.setEngines(padState === 'stack' ? frame.boosterEngines : 0)
    ship.setEngines(padState === 'stack' || padState === 'landing' ? frame.shipEngines : 0)
  }

  function followVehicle() {
    // keep the orbit target glued to the vehicle while it climbs
    const y = padState === 'stack' ? stack.position.y : padState === 'landing' ? ship.group.position.y : STACK_BASE_Y
    const dy = y - lastFollowY
    if (Math.abs(dy) > 1e-3) {
      padCtl.target.y += dy
      padCam.position.y += dy
    }
    lastFollowY = y
  }

  function resize() {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h, false)
    padCam.aspect = mapCam.aspect = w / h
    padCam.updateProjectionMatrix()
    mapCam.updateProjectionMatrix()
    map.setResolution(w, h)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  let clock = 0
  const api: SceneApi = {
    get view() {
      return view
    },
    get padState() {
      return padState
    },
    setView(v) {
      view = v
      padCtl.enabled = v === 'pad'
      mapCtl.enabled = v === 'map'
    },
    resetCamera() {
      const [cam, ctl, d] = view === 'pad' ? [padCam, padCtl, padDefault] : [mapCam, mapCtl, mapDefault]
      cam.position.copy(d.pos)
      ctl.target.copy(d.target)
      if (view === 'pad') {
        cam.position.y += lastFollowY - STACK_BASE_Y
        ctl.target.y += lastFollowY - STACK_BASE_Y
      }
      ctl.update()
    },
    render(frame, dtReal) {
      clock += dtReal
      applyFrame(frame)
      booster.tick(clock)
      ship.tick(clock + 0.37)
      const target = frame.time >= t.catch ? 1 : 0
      arms += (target - arms) * (1 - Math.exp(-dtReal * 2.4))
      tower.setArms(arms)
      map.update(frame.time)
      followVehicle()
      if (view === 'pad') {
        padCtl.update()
        renderer.render(padScene, padCam)
      } else {
        mapCtl.update()
        renderer.render(mapScene, mapCam)
      }
    },
    labels(frame) {
      const cam = view === 'pad' ? padCam : mapCam
      const w = host.clientWidth
      const h = host.clientHeight
      const out: ProjectedLabel[] = []
      const v = new THREE.Vector3()
      const push = (id: string, text: string, kind: ProjectedLabel['kind'], pos: THREE.Vector3 | null, dimmed: boolean, align: 'top' | 'right' = 'top', off: [number, number] = [0, 0]) => {
        if (!pos) {
          out.push({ id, text, kind, x: 0, y: 0, visible: false, dim: dimmed, align })
          return
        }
        v.copy(pos).project(cam)
        const x = (v.x * 0.5 + 0.5) * w + off[0]
        const y = (-v.y * 0.5 + 0.5) * h + off[1]
        // keep labels clear of the top bar and the bottom transport
        const visible = v.z > -1 && v.z < 1 && x > 8 && x < w - 8 && y > 70 && y < h - 60
        out.push({ id, text, kind, x, y, visible, dim: dimmed, align })
      }
      if (view === 'pad') for (const a of padAnchors) push(a.id, a.text, a.kind, a.at(), false, a.align)
      else for (const a of map.anchors) push(a.id, a.text, a.kind, a.pos, a.t !== undefined && frame.time < a.t, 'top', a.off)
      return out
    },
    resize,
    dispose() {
      ro.disconnect()
      padCtl.dispose()
      mapCtl.dispose()
      map.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
  return api
}
