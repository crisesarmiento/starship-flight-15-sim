import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CameraRig, CAMERA_MODES, type CameraMode, type FocusSet } from './visual/cameraRig'
import { earthRadiusM, entryHandoff, eventTime, flight, frameAt, type Sample } from './visual/core'
import { VISUAL, measuredFrom } from './visual/dimensions'
import { buildEarth, buildPadTerrain, buildSky } from './visual/earth'
import { SUN_DIRECTION, attitudeQuaternion, ecefToEci, enuAt, enuMatrix, geodeticToScene, toScene, type AttitudeTimes } from './visual/frames'
import { activeManeuver, buildManeuvers, dvLabel } from './visual/maneuvers'
import { Overlays, type Anchor, type LabelKind } from './visual/overlays'
import { CATCH_PIN_OFFSET, STACK_BASE_Y, TOWER_POS, buildApron, buildMount, buildTower } from './visual/site'
import { buildBooster, buildShip } from './visual/vehicles'

export type { CameraMode }
export { CAMERA_MODES }

export interface SceneOptions {
  orbit: boolean
  track: boolean
  trails: boolean
  /** Grow vehicles with the camera distance so they stay visible from far away. */
  visualScale: boolean
  labels: boolean
}

export interface ProjectedLabel {
  id: string
  text: string
  kind: LabelKind
  x: number
  y: number
  visible: boolean
  dim: boolean
  align: 'top' | 'right'
}

export interface SceneStatus {
  mode: CameraMode
  /** Visual scale applied to the vehicles (1 = real size). */
  scale: number
  camDistanceM: number
  camAltitudeM: number
}

export interface SceneApi {
  readonly mode: CameraMode
  readonly options: SceneOptions
  status(): SceneStatus
  setMode(m: CameraMode): void
  setOptions(o: Partial<SceneOptions>): void
  resetCamera(): void
  render(s: Sample, dtReal: number, wallMs: number): void
  labels(s: Sample): ProjectedLabel[]
  resize(): void
  dispose(): void
}

const vehicleName = (full: string) => full.split('(')[0].trim()

export function createScene(host: HTMLElement): SceneApi {
  const m = measuredFrom(flight)
  const R = earthRadiusM
  const maneuvers = buildManeuvers()
  const T: AttitudeTimes = {
    hotStaging: eventTime('hot_staging'),
    boostbackStart: eventTime('boostback_start'),
    boostbackShutdown: eventTime('boostback_shutdown'),
    boosterLandingStart: eventTime('booster_landing_burn_start'),
    entry: eventTime('entry'),
    shipLandingStart: eventTime('ship_landing_burn_start'),
    deorbitStart: eventTime('deorbit_start'),
    deorbitShutdown: eventTime('deorbit_shutdown'),
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'stage-canvas'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 5e9)
  const world = new THREE.Group()
  world.name = 'world'
  scene.add(world)
  const rig = new CameraRig(camera, renderer.domElement, world, R)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  // ---- lights (kept in the scene root, re-aimed every frame in the camera frame)
  const hemi = new THREE.HemisphereLight(0xb7cdf0, 0x6d6246, 0.6)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffe2b8, 4.4)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  const sc = sun.shadow.camera
  sc.left = -240
  sc.right = 240
  sc.top = 240
  sc.bottom = -240
  sc.near = 100
  sc.far = 8000
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.6
  scene.add(sun, sun.target)

  const sky = buildSky()
  scene.add(sky.group)

  // ---- Earth and the pad, Earth-fixed
  const earth = buildEarth(R)
  world.add(earth.group)
  const overlays = new Overlays(R, { fts: eventTime('booster_fts'), entry: T.entry, deorbitShutdown: T.deorbitShutdown, insertionStart: eventTime('insertion_start'), hotStaging: T.hotStaging, entryCut: entryHandoff.time }, flight.mission.payload.count.value)
  world.add(overlays.inertial)
  earth.group.add(overlays.fixed)

  const enu = enuAt(m.padLat, m.padLon)
  const padEcef = geodeticToScene(m.padLat, m.padLon, R)
  const padGroup = new THREE.Group()
  padGroup.name = 'pad-site'
  padGroup.matrixAutoUpdate = false
  padGroup.matrix.copy(enuMatrix(enu, padEcef))
  earth.group.add(padGroup)
  padGroup.add(buildPadTerrain(R), buildApron(), buildMount())

  // the catch arms sit where the model puts the Ship at the catch; the tower stays schematic
  const shipAtCatch = frameAt(eventTime('ship_catch')).ship
  const armY = THREE.MathUtils.clamp(shipAtCatch.altitudeM + STACK_BASE_Y + CATCH_PIN_OFFSET, 48, VISUAL.towerHeight - 14)
  const tower = buildTower(armY)
  padGroup.add(tower.group)

  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffb070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }))
  beacon.visible = false
  earth.group.add(beacon)
  beacon.position.copy(padEcef)

  // ---- vehicles (inertial)
  const booster = buildBooster(m)
  const ship = buildShip(m)
  overlays.inertial.add(booster.group, ship.group)
  for (const g of [booster.group, ship.group, tower.group]) {
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        if (x instanceof THREE.MeshStandardMaterial) {
          x.envMap = envMap
          x.envMapIntensity = 0.5
        }
      }
    })
  }

  // dimension lines in metres, following the booster before staging
  const dim = new THREE.Group()
  {
    const pts: number[] = []
    const seg = (a: [number, number, number], b: [number, number, number]) => pts.push(...a, ...b)
    const dx = 9.5
    const dx2 = 15.5
    const tick = 1.4
    for (const [y0, y1] of [[0, m.boosterHeight], [m.boosterHeight, m.stackHeight]]) {
      seg([dx, y0, 0], [dx, y1, 0])
      seg([dx - tick, y0, 0], [dx + tick, y0, 0])
      seg([dx - tick, y1, 0], [dx + tick, y1, 0])
    }
    seg([dx2, 0, 0], [dx2, m.stackHeight, 0])
    seg([dx2 - tick, 0, 0], [dx2 + tick, 0, 0])
    seg([dx2 - tick, m.stackHeight, 0], [dx2 + tick, m.stackHeight, 0])
    seg([-m.diameter / 2, -4, 0], [m.diameter / 2, -4, 0])
    seg([-m.diameter / 2, -4 - tick, 0], [-m.diameter / 2, -4 + tick, 0])
    seg([m.diameter / 2, -4 - tick, 0], [m.diameter / 2, -4 + tick, 0])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, depthTest: false }))
    l.renderOrder = 6
    dim.add(l)
  }
  booster.group.add(dim)

  // ---- state
  const options: SceneOptions = { orbit: true, track: false, trails: true, visualScale: true, labels: true }
  let scale = 1
  let camAltitude = 0
  let arms = 0
  let clock = 0
  const names = { booster: vehicleName(flight.mission.booster.value), ship: vehicleName(flight.mission.ship.value) }

  let lastSample: Sample | null = null
  let placed = false
  let overlayAnchors: Anchor[] = []

  // scratch
  const vS = new THREE.Vector3()
  const rB = new THREE.Vector3()
  const rS = new THREE.Vector3()
  const padUpI = new THREE.Vector3()
  const padPosI = new THREE.Vector3()

  /** Middle of a vehicle's body, in the inertial frame, so the camera frames the whole vehicle. */
  function bodyCenter(g: THREE.Group, height: number, fallback: THREE.Vector3): THREE.Vector3 {
    if (!placed) return fallback.clone().addScaledVector(fallback.clone().normalize(), STACK_BASE_Y + height / 2)
    return g.position.clone().add(new THREE.Vector3(0, (height / 2) * scale, 0).applyQuaternion(g.quaternion))
  }

  function focusFor(s: Sample): FocusSet {
    toScene(s.ship.r, rS)
    toScene(s.ship.v, vS)
    toScene(s.booster.r, rB)
    const theta = s.earthAngleRad
    ecefToEci(padEcef, theta, padPosI)
    ecefToEci(enu.up, theta, padUpI)
    const h = new THREE.Vector3().crossVectors(rS, vS)
    return {
      ship: { origin: bodyCenter(ship.group, m.shipHeight, rS), up: rS.clone().normalize() },
      booster: { origin: bodyCenter(booster.group, m.boosterHeight, rB), up: rB.clone().normalize() },
      pad: { origin: padPosI.clone().addScaledVector(padUpI, 70), up: padUpI.clone() },
      orbitNormal: h.lengthSq() > 1 ? h.normalize() : null,
      earthRadius: R,
      shipRadius: rS.length(),
    }
  }

  function placeVehicle(rigV: typeof ship, kind: 'ship' | 'booster', s: Sample, t: number) {
    const st = s[kind]
    const r = toScene(st.r)
    const v = toScene(st.v)
    const up = r.clone().normalize()
    const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), up)
    if (east.lengthSq() < 1e-8) east.set(0, 0, -1)
    east.normalize()
    const q = attitudeQuaternion(kind, { t, r, v, surfaceSpeedMs: st.surfaceSpeedMs, east }, T)
    rigV.group.quaternion.copy(q)
    rigV.group.scale.setScalar(scale)
    // the stack stands on the mount: a constant visual datum above the ground point the core reports
    rigV.group.position.copy(r).addScaledVector(up, STACK_BASE_Y * scale)
    return { r, up, q }
  }

  function render(s: Sample, dtReal: number, wallMs: number) {
    clock += dtReal
    const t = s.time
    earth.group.rotation.y = s.earthAngleRad

    // vehicles first (using last frame's visual scale), so the camera can aim at their centres
    const pb = placeVehicle(booster, 'booster', s, t)
    placeVehicle(ship, 'ship', s, t)
    // before and just after staging the two share a stack: keep the Ship one stack-length ahead of the booster base
    if (t < T.hotStaging + 30) {
      const gap = ship.group.position.distanceTo(booster.group.position)
      const need = m.boosterHeight * scale
      if (gap < need) ship.group.position.copy(booster.group.position).addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(pb.q), need)
    }
    placed = true
    const f = focusFor(s)
    rig.update(dtReal, f)
    const camDist = rig.currentDistance()
    const nextScale = options.visualScale ? THREE.MathUtils.clamp(camDist / 4000, 1, 20000) : 1
    scale = nextScale

    booster.group.visible = s.booster.status !== 'fts'
    booster.setEngines(s.boosterEngines)
    ship.setEngines(s.ship.status === 'caught' ? 0 : s.shipEngines)
    booster.tick(clock)
    ship.tick(clock + 0.37)
    dim.visible = t < T.hotStaging && camDist < 4000

    // tower arms close when the core says the Ship is caught
    arms += ((s.ship.status === 'caught' ? 1 : 0) - arms) * (1 - Math.exp(-dtReal * 2.4))
    tower.setArms(arms)

    // lights and sky in the camera frame
    const sunDir = SUN_DIRECTION.clone().applyQuaternion(rig.worldQuat)
    sun.position.copy(sunDir).multiplyScalar(4000)
    sun.target.position.set(0, 0, 0)
    sun.castShadow = camDist < 3500
    earth.setSun(sunDir)
    const camInertial = world.worldToLocal(camera.position.clone())
    camAltitude = camInertial.length() - R
    const upScene = camInertial.clone().normalize().applyQuaternion(world.quaternion)
    sky.update({ camera: camera.position, upInScene: upScene, sunInScene: sunDir, altitudeM: camAltitude, worldQuat: world.quaternion })
    earth.atmosphere.visible = camAltitude > 140_000
    beacon.visible = camDist > 6e4
    beacon.scale.setScalar(camDist * 0.014)
    ;(beacon.material as THREE.SpriteMaterial).opacity = 0.9

    overlayAnchors = overlays.update({ t, s, scale, camDist, wall: wallMs, orbit: options.orbit && camDist > 20_000, track: options.track, trails: options.trails })
    renderer.render(scene, camera)
  }

  const toWorld = (p: THREE.Vector3) => overlays.inertial.localToWorld(p.clone())
  const proj = new THREE.Vector3()

  function labels(s: Sample): ProjectedLabel[] {
    if (!options.labels) return []
    const w = host.clientWidth
    const h = host.clientHeight
    const out: ProjectedLabel[] = []
    const camDist = rig.currentDistance()
    const push = (id: string, text: string, kind: LabelKind, world: THREE.Vector3 | null, opts: { dim?: boolean; align?: 'top' | 'right' } = {}) => {
      if (!world) return
      proj.copy(world).project(camera)
      const x = (proj.x * 0.5 + 0.5) * w
      const y = (-proj.y * 0.5 + 0.5) * h
      const visible = proj.z > -1 && proj.z < 1 && x > 8 && x < w - 8 && y > 72 && y < h - 70
      out.push({ id, text, kind, x, y, visible, dim: !!opts.dim, align: opts.align ?? 'top' })
    }

    push('pad', 'Pad 2 · Starbase', 'pad', earth.group.localToWorld(padEcef.clone()))
    if (camDist < 3000) push('tower', 'Torre de captura: proporción esquemática', 'event', padGroup.localToWorld(new THREE.Vector3(TOWER_POS.x, VISUAL.towerHeight + 26, TOWER_POS.z)))
    if (dim.visible) {
      const at = (x: number, y: number) => booster.group.localToWorld(new THREE.Vector3(x, y, 0))
      push('l-booster', `${m.boosterHeight} m`, 'dim', at(11.7, m.boosterHeight / 2), { align: 'right' })
      push('l-ship', `${m.shipHeight} m`, 'dim', at(11.7, m.boosterHeight + m.shipHeight / 2), { align: 'right' })
      push('l-stack', `Stack ${m.stackHeight} m`, 'dim', at(17.7, m.stackHeight * 0.62), { align: 'right' })
      push('l-dia', `Ø ${m.diameter} m`, 'dim', at(0, -7.2))
    }
    if (s.booster.status !== 'fts') push('v-booster', names.booster, 'event', booster.group.localToWorld(new THREE.Vector3(0, m.boosterHeight * 0.5 + 6, 0)), { align: 'right' })
    push('v-ship', names.ship, 'event', ship.group.localToWorld(new THREE.Vector3(0, m.shipHeight * 0.5 + 6, 0)), { align: 'right' })
    const burn = activeManeuver(maneuvers, s.time)
    if (burn) {
      const g = burn.vehicle === 'ship' ? ship.group : booster.group
      push('burn', `${burn.label} · ${dvLabel(burn)}`, 'burn', g.localToWorld(new THREE.Vector3(0, -10, 0)), { align: 'right' })
    }
    for (const a of overlayAnchors) push(a.id, a.text, a.kind, a.fixed ? earth.group.localToWorld(a.pos.clone()) : toWorld(a.pos), { dim: a.dim, align: a.align })

    // satellites: keep the numbers readable
    const placed: { x: number; y: number }[] = []
    for (const l of out) {
      if (l.kind !== 'sat' || !l.visible) continue
      if (placed.some((p) => Math.hypot(p.x - l.x, p.y - l.y) < 24)) l.visible = false
      else placed.push(l)
    }
    return out
  }

  function resize() {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    overlays.setResolution(w, h)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()
  rig.setMode('pad', focusFor(frameAt(0)))

  return {
    get mode() {
      return rig.mode
    },
    get options() {
      return options
    },
    status: () => ({ mode: rig.mode, scale, camDistanceM: rig.currentDistance(), camAltitudeM: camAltitude }),
    setMode(mode) {
      rig.setMode(mode, focusFor(lastSample ?? frameAt(0)))
    },
    setOptions(o) {
      Object.assign(options, o)
    },
    resetCamera() {
      rig.reset(focusFor(lastSample ?? frameAt(0)))
    },
    render(s, dt, wall) {
      lastSample = s
      render(s, dt, wall)
    },
    labels,
    resize,
    dispose() {
      ro.disconnect()
      rig.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
