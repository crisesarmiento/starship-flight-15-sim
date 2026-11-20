/**
 * Schematic route of the whole flight. NOT a trajectory.
 *
 * Positions are hand-placed in "map units" so the story reads end to end
 * (x east, z south, y a made-up height). Only the times come from the timeline.
 * A later pass can swap `routePos` for core positions without touching the scene.
 */
import type { TimelineEvent } from './core'

export type Vec = [number, number, number]
export type RouteId = 'booster' | 'ship' | 'planned'

interface Key {
  /** Timeline event id, or none for a free shape point. */
  id?: string
  /** Explicit time for free points. */
  t?: number
  p: Vec
}

/** Coastline of the schematic map (x east, z south). Land lies west of it. */
export const MAP_COAST: [number, number][] = [
  [90, -160],
  [52, -112],
  [20, -64],
  [6, -22],
  [2, 0],
  [6, 22],
  [10, 66],
  [14, 120],
  [24, 170],
]
export const MAP_LAND_WEST_X = -125
export const MAP_ORBIT = { center: [100, 62, 36] as Vec, rx: 70, rz: 40, tilt: 10, theta0: -0.4 }

const shared: Key[] = [
  { id: 'liftoff', p: [0, 0, 0] },
  { id: 'max_q', p: [7, 3, 0.5] },
  { id: 'meco', p: [44, 22, -3.5] },
  { id: 'hot_staging', p: [46, 24, -4] },
]

const BOOSTER_KEYS: Key[] = [
  ...shared,
  { id: 'boostback_start', p: [50, 25, -4.5] },
  { id: 'boostback_shutdown', p: [62, 31, -7] },
  { t: 270, p: [64, 38, -2] },
  { id: 'booster_landing_burn_start', p: [54, 8, 12] },
  { id: 'booster_fts', p: [52, 0.4, 15] },
]

/** Original plan: come back and be caught by the tower. It did not happen. */
const PLANNED_KEYS: Key[] = [
  { id: 'boostback_shutdown', p: [62, 31, -7] },
  { t: 270, p: [34, 38, -5] },
  { id: 'booster_landing_burn_start', p: [8, 9, -1] },
  { t: 395, p: [0, 1.5, 0] },
]

const SHIP_KEYS: Key[] = [
  ...shared,
  { id: 'ship_ascent_cutoff', p: [162, 50, 28] },
  { id: 'insertion_start', p: orbitPoint(MAP_ORBIT.theta0) },
  { id: 'insertion_shutdown', p: orbitPoint(MAP_ORBIT.theta0) },
  { id: 'deorbit_start', p: orbitPoint(MAP_ORBIT.theta0) },
  { id: 'deorbit_shutdown', p: orbitPoint(MAP_ORBIT.theta0) },
  { t: 78800, p: [20, 92, 66] },
  { id: 'entry', p: [-140, 24, 52] },
  { t: 80300, p: [-92, 16, 30] },
  { t: 80650, p: [-44, 12, -28] },
  { id: 'transonic', p: [34, 9, -14] },
  { id: 'subsonic', p: [40, 6.5, -6] },
  { id: 'ship_landing_burn_start', p: [32, 4, 2] },
  { id: 'landing_flip', p: [22, 3, 2] },
  { id: 'landing_3_to_2', p: [10, 2.2, 1] },
  { id: 'ship_catch', p: [0, 1.4, 0] },
]

export function orbitPoint(theta: number): Vec {
  const o = MAP_ORBIT
  return [o.center[0] + o.rx * Math.cos(theta), o.center[1] + o.tilt * Math.sin(theta), o.center[2] + o.rz * Math.sin(theta)]
}

/** Monotone cubic (PCHIP): smooth and never overshoots between keys. */
function pchip(ts: number[], vs: number[]): (t: number) => number {
  const n = ts.length
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i])
    d.push((vs[i + 1] - vs[i]) / h[i])
  }
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * h[i] + h[i - 1]
      const w2 = h[i] + 2 * h[i - 1]
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  return (t: number) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid
    }
    const s = (t - ts[lo]) / h[lo]
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * vs[lo] +
      (s3 - 2 * s2 + s) * h[lo] * m[lo] +
      (-2 * s3 + 3 * s2) * vs[lo + 1] +
      (s3 - s2) * h[lo] * m[lo + 1]
    )
  }
}

export interface Route {
  id: RouteId
  keys: { t: number; p: Vec; id?: string }[]
  /** Position at mission time t (clamped to the route ends). */
  pos(t: number): Vec
  /** Coasting loop inside [t0, t1], if the route has one. */
  orbit?: { t0: number; t1: number; turns: number }
}

function resolve(keys: Key[], byId: Map<string, TimelineEvent>): { t: number; p: Vec; id?: string }[] {
  const out = keys.map((k) => {
    const ev = k.id ? byId.get(k.id) : undefined
    const t = ev ? ev.t_sec : k.t
    if (t === undefined) throw new Error(`Route key sin tiempo: ${k.id}`)
    return { t, p: k.p, id: ev ? k.id : undefined }
  })
  // Same-time pairs (e.g. FTS at the shutdown second) get a tiny offset to keep times strictly increasing.
  for (let i = 1; i < out.length; i++) if (out[i].t <= out[i - 1].t) out[i] = { ...out[i], t: out[i - 1].t + 0.001 }
  return out
}

function build(id: RouteId, keys: Key[], byId: Map<string, TimelineEvent>, turns?: number): Route {
  const rk = resolve(keys, byId)
  const ts = rk.map((k) => k.t)
  const fx = pchip(ts, rk.map((k) => k.p[0]))
  const fy = pchip(ts, rk.map((k) => k.p[1]))
  const fz = pchip(ts, rk.map((k) => k.p[2]))
  let orbit: Route['orbit']
  if (turns) {
    const a = rk.find((k) => k.id === 'insertion_shutdown')
    const b = rk.find((k) => k.id === 'deorbit_start')
    if (a && b) orbit = { t0: a.t, t1: b.t, turns }
  }
  return {
    id,
    keys: rk,
    orbit,
    pos(t) {
      if (orbit && t > orbit.t0 && t < orbit.t1) {
        const th = MAP_ORBIT.theta0 + Math.PI * 2 * orbit.turns * ((t - orbit.t0) / (orbit.t1 - orbit.t0))
        return orbitPoint(th)
      }
      return [fx(t), fy(t), fz(t)]
    },
  }
}

export interface Routes {
  booster: Route
  planned: Route
  ship: Route
}

export function buildRoutes(timeline: TimelineEvent[], orbitTurns: number): Routes {
  const byId = new Map(timeline.map((e) => [e.id, e]))
  return {
    booster: build('booster', BOOSTER_KEYS, byId),
    planned: build('planned', PLANNED_KEYS, byId),
    ship: build('ship', SHIP_KEYS, byId, orbitTurns),
  }
}

/** Polyline of a route for drawing, with the time of every point. The orbit loop is skipped (drawn as a ring). */
export function sampleRoute(r: Route, pointsPerSegment = 28): { t: number; p: Vec }[][] {
  const runs: { t: number; p: Vec }[][] = []
  let cur: { t: number; p: Vec }[] = []
  for (let i = 0; i < r.keys.length - 1; i++) {
    const a = r.keys[i].t
    const b = r.keys[i + 1].t
    const inOrbit = r.orbit && a >= r.orbit.t0 && b <= r.orbit.t1
    if (inOrbit) {
      if (cur.length) runs.push(cur)
      cur = []
      continue
    }
    const n = Math.max(2, b - a < 5 ? 2 : pointsPerSegment)
    for (let j = i === 0 || cur.length === 0 ? 0 : 1; j <= n; j++) {
      const t = a + ((b - a) * j) / n
      cur.push({ t, p: r.pos(t) })
    }
  }
  if (cur.length) runs.push(cur)
  return runs
}

export function ringPoints(n = 160): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i <= n; i++) pts.push(orbitPoint(MAP_ORBIT.theta0 + (i / n) * Math.PI * 2))
  return pts
}

/** Is a map point east of the coast (i.e. over the Gulf)? */
export function isOverGulf(x: number, z: number): boolean {
  for (let i = 0; i < MAP_COAST.length - 1; i++) {
    const [x0, z0] = MAP_COAST[i]
    const [x1, z1] = MAP_COAST[i + 1]
    if (z >= z0 && z <= z1) return x > x0 + ((x1 - x0) * (z - z0)) / (z1 - z0)
  }
  return false
}
