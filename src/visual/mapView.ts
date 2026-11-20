import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { TimelineEvent } from './core'
import { MAP_COAST, MAP_LAND_WEST_X, buildRoutes, ringPoints, sampleRoute, type Route, type Vec } from './route'

export interface Anchor {
  id: string
  text: string
  /** world position (inside the map group, already offset) */
  pos: THREE.Vector3
  kind: 'pad' | 'event' | 'fts' | 'catch' | 'ghost' | 'region'
  /** screen-space nudge in px, to keep neighbouring labels apart */
  off?: [number, number]
  /** show only after this mission time (event pins show always, dimmed until reached) */
  t?: number
}

export const MAP_OFFSET = new THREE.Vector3(0, 0, 0)

const COL = {
  sea: 0x081a26,
  land: 0x1b2a24,
  coast: 0x7fb8ac,
  grid: 0x16303c,
  booster: 0x7fd0ff,
  ship: 0xffe0a8,
  ghost: 0x8793a0,
  fts: 0xff4a3d,
  catchGreen: 0x4be39a,
  ring: 0xc9a9ff,
}

function glowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function thick(points: Vec[], color: number, width: number, opts: { dashed?: boolean; opacity?: number } = {}) {
  const geo = new LineGeometry()
  geo.setPositions(points.flat())
  const mat = new LineMaterial({
    color,
    linewidth: width,
    transparent: true,
    opacity: opts.opacity ?? 1,
    dashed: !!opts.dashed,
    dashSize: 3,
    gapSize: 2.4,
    worldUnits: false,
  })
  const line = new Line2(geo, mat)
  if (opts.dashed) line.computeLineDistances()
  return { line, geo, mat }
}

interface RunLine {
  route: 'booster' | 'ship'
  times: number[]
  geoFull: LineGeometry
  bright: ReturnType<typeof thick>
  points: Vec[]
}

export interface MapView {
  group: THREE.Group
  anchors: Anchor[]
  routes: ReturnType<typeof buildRoutes>
  update(t: number): void
  setResolution(w: number, h: number): void
  dispose(): void
}

export function buildMap(timeline: TimelineEvent[], orbitTurns: number): MapView {
  const routes = buildRoutes(timeline, orbitTurns)
  const byId = new Map(timeline.map((e) => [e.id, e]))
  const group = new THREE.Group()
  group.name = 'map'
  group.position.copy(MAP_OFFSET)
  const lineMats: LineMaterial[] = []
  const anchors: Anchor[] = []

  // ---- base: sea, land, coast, grid
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 900).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: COL.sea }),
  )
  sea.position.set(40, -0.4, 20)
  group.add(sea)

  const landShape = new THREE.Shape()
  const lpts: [number, number][] = [
    [MAP_LAND_WEST_X, -220],
    [MAP_COAST[0][0] + 24, -220],
    ...MAP_COAST.map(([x, z]) => [x, z] as [number, number]),
    [MAP_COAST[MAP_COAST.length - 1][0] + 6, 220],
    [MAP_LAND_WEST_X, 220],
  ]
  landShape.moveTo(lpts[0][0], -lpts[0][1])
  for (const [x, z] of lpts.slice(1)) landShape.lineTo(x, -z)
  landShape.closePath()
  const land = new THREE.Mesh(new THREE.ShapeGeometry(landShape).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.land }))
  group.add(land)

  const coast = thick(MAP_COAST.map(([x, z]) => [x, 0.15, z] as Vec), COL.coast, 2, { opacity: 0.8 })
  group.add(coast.line)
  lineMats.push(coast.mat)

  const grid = new THREE.GridHelper(700, 35, COL.grid, COL.grid)
  grid.position.set(40, 0.05, 20)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.5
  group.add(grid)

  // regions (dim labels)
  const region = (id: string, text: string, x: number, z: number) =>
    anchors.push({ id, text, pos: new THREE.Vector3(x, 0, z).add(MAP_OFFSET), kind: 'region' })
  region('r-gulf', 'Golfo de México', 95, -30)
  region('r-pacific', 'Océano Pacífico', -150, 20)
  region('r-mex', 'México', -70, 60)
  region('r-us', 'Texas · suroeste de EE. UU.', -60, -70)

  // ---- routes
  const runs: RunLine[] = []
  const addRoute = (r: Route, color: number, width: number, progressive: boolean, dashed = false, dim = 0.22) => {
    for (const run of sampleRoute(r)) {
      const pts = run.map((s) => s.p)
      const dimLine = thick(pts, color, width, { dashed, opacity: progressive ? dim : 0.75 })
      group.add(dimLine.line)
      lineMats.push(dimLine.mat)
      if (!progressive) continue
      const bright = thick(pts, color, width + 0.6)
      bright.geo.instanceCount = 0
      bright.line.visible = false
      group.add(bright.line)
      lineMats.push(bright.mat)
      runs.push({ route: r.id as 'booster' | 'ship', times: run.map((s) => s.t), geoFull: bright.geo, bright, points: pts })
    }
  }
  addRoute(routes.planned, COL.ghost, 1.6, false, true)
  addRoute(routes.booster, COL.booster, 2.2, true)
  addRoute(routes.ship, COL.ship, 2.2, true)

  // orbit ring (schematic)
  const ring = thick(ringPoints(), COL.ring, 1.6, { opacity: 0.25 })
  group.add(ring.line)
  lineMats.push(ring.mat)
  const ringActive = thick(ringPoints(), COL.ring, 2.4, { opacity: 0.9 })
  ringActive.line.visible = false
  group.add(ringActive.line)
  lineMats.push(ringActive.mat)
  const orbit = routes.ship.orbit

  // tails: segment from last sampled point to the exact current position
  const tails = {
    booster: thick([[0, 0, 0], [0, 0, 0]], COL.booster, 2.8),
    ship: thick([[0, 0, 0], [0, 0, 0]], COL.ship, 2.8),
  }
  for (const k of ['booster', 'ship'] as const) {
    group.add(tails[k].line)
    lineMats.push(tails[k].mat)
  }

  // ---- pins
  const pinState: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; color: number; ghost: boolean }[] = []
  const addPin = (id: string, text: string, p: Vec, color: number, kind: Anchor['kind'], t: number, off?: [number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
    const m = new THREE.Mesh(new THREE.SphereGeometry(kind === 'fts' || kind === 'catch' ? 2.3 : 1.5, 16, 12), mat)
    m.position.set(...p)
    group.add(m)
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0], 0.1, p[2]), new THREE.Vector3(...p)]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
    )
    group.add(stem)
    pinState.push({ mesh: m, mat, t, color, ghost: kind === 'ghost' })
    anchors.push({ id, text, pos: new THREE.Vector3(p[0], p[1] + 4, p[2]).add(MAP_OFFSET), kind, t, off })
  }
  const at = (id: string) => byId.get(id)?.t_sec ?? 0
  addPin('p-pad', 'Pad 2 · torre', [0, 0, 0], 0xffffff, 'pad', 0, [-70, 30])
  addPin('p-stage', 'Hot-staging', routes.ship.pos(at('hot_staging')), COL.ship, 'event', at('hot_staging'))
  addPin('p-bbs', 'Fin del boostback', routes.booster.pos(at('boostback_shutdown')), COL.booster, 'event', at('boostback_shutdown'))
  addPin('p-fts', 'FTS del booster · no hubo catch', routes.booster.pos(at('booster_fts')), COL.fts, 'fts', at('booster_fts'), [64, 22])
  addPin('p-planned', 'Catch planificada · no ocurrió', routes.planned.pos(395), COL.ghost, 'ghost', 395, [-100, -30])
  addPin('p-ins', 'Inserción orbital', routes.ship.pos(at('insertion_shutdown')), COL.ship, 'event', at('insertion_shutdown'))
  addPin('p-deorbit', 'Desórbita', routes.ship.pos(at('deorbit_shutdown')), COL.ship, 'event', at('deorbit_shutdown'))
  addPin('p-entry', 'Reentrada', routes.ship.pos(at('entry')), COL.ship, 'event', at('entry'))
  addPin('p-catch', 'Catch de la Ship', routes.ship.pos(at('ship_catch')), COL.catchGreen, 'catch', at('ship_catch'), [-10, 66])

  // ---- vehicle icons (not to scale)
  const glow = glowTexture()
  const icon = (color: number, ship: boolean) => {
    const g = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color })
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, ship ? 4.2 : 5.6, 14), mat)
    g.add(body)
    if (ship) {
      const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 14), mat)
      nose.position.y = 3.3
      g.add(nose)
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }))
    halo.scale.setScalar(14)
    g.add(halo)
    return g
  }
  const boosterIcon = icon(COL.booster, false)
  const shipIcon = icon(COL.ship, true)
  group.add(boosterIcon, shipIcon)

  // FTS burst
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: COL.fts, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
  burst.position.set(...routes.booster.pos(395))
  burst.visible = false
  group.add(burst)
  const catchRing = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.catchGreen, transparent: true, side: THREE.DoubleSide }))
  catchRing.position.set(0, 0.3, 0)
  catchRing.visible = false
  group.add(catchRing)

  const ftsT = at('booster_fts')
  const catchT = at('ship_catch')

  function update(t: number) {
    // progress lines + tails (tail joins the last sampled point to the exact position)
    const tailOn = { booster: false, ship: false }
    const tEnd = { booster: Math.min(t, ftsT), ship: t }
    for (const run of runs) {
      const ts = run.times
      let k = 0
      while (k < ts.length && ts[k] <= t) k++
      run.bright.line.visible = k > 1
      run.geoFull.instanceCount = Math.max(0, k - 1)
      if (k > 0 && k < ts.length) {
        const r = routes[run.route]
        const tail = tails[run.route]
        tail.geo.setPositions([...run.points[k - 1], ...r.pos(tEnd[run.route])])
        tailOn[run.route] = true
      }
    }
    tails.booster.line.visible = tailOn.booster
    tails.ship.line.visible = tailOn.ship

    // icons
    const bp = routes.booster.pos(tEnd.booster)
    boosterIcon.position.set(bp[0], bp[1], bp[2])
    boosterIcon.visible = t < ftsT
    const sp = routes.ship.pos(t)
    shipIcon.position.set(sp[0], sp[1], sp[2])

    // orbit ring
    ringActive.line.visible = !!orbit && t >= orbit.t0 && t <= orbit.t1

    // pins
    for (const p of pinState) {
      const reached = t >= p.t
      p.mat.opacity = reached ? 1 : p.ghost ? 0.2 : 0.28
    }
    // FTS flash: stays as a dim scar, bright for ~15 s of mission time
    burst.visible = t >= ftsT
    const since = t - ftsT
    burst.scale.setScalar(since < 20 ? 8 + since * 1.1 : 18)
    ;(burst.material as THREE.SpriteMaterial).opacity = since < 20 ? 1 : 0.5
    catchRing.visible = t >= catchT
  }

  function setResolution(w: number, h: number) {
    for (const m of lineMats) m.resolution.set(w, h)
    for (const k of ['booster', 'ship'] as const) tails[k].mat.resolution.set(w, h)
  }

  update(0)
  return {
    group,
    anchors,
    routes,
    update,
    setResolution,
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
      })
    },
  }
}
