import { add, clamp, cross, deg, dot, earthRadiusM, gravity, mu, norm, scale, sub, unit,
  type State, type Vec3 } from './frame'

const tau = 2 * Math.PI
const epsilon = 1e-10 // Numerical tolerance for circular and degenerate elements.

function geometry(r: Vec3, v: Vec3) {
  const radius = norm(r)
  if (!Number.isFinite(radius) || radius === 0 || !Number.isFinite(norm(v))) return null
  const h = cross(r, v)
  const hLength = norm(h)
  if (hLength === 0) return null
  const normal = scale(h, 1 / hLength)
  const eVector = sub(scale(cross(v, h), 1 / mu), unit(r))
  const e = norm(eVector)
  const p = hLength ** 2 / mu
  const invA = 2 / radius - dot(v, v) / mu
  const a = invA > 0 && e < 1 ? 1 / invA : null
  const peri = e > epsilon ? scale(eVector, 1 / e) : unit(r)
  const side = cross(normal, peri)
  return { e, p, a, peri, side, normal }
}

export type Orbit = {
  perigeeM: number | null; apogeeM: number | null; inclinationDeg: number | null
  periodS: number | null; eccentricity: number | null
}

export function elements({ r, v }: State): Orbit {
  const g = geometry(r, v)
  if (!g) return { perigeeM: null, apogeeM: null, inclinationDeg: null, periodS: null, eccentricity: null }
  return {
    perigeeM: g.p / (1 + g.e) - earthRadiusM,
    apogeeM: g.a === null ? null : g.a * (1 + g.e) - earthRadiusM,
    inclinationDeg: Math.acos(clamp(g.normal[2], -1, 1)) / deg,
    periodS: g.a === null ? null : tau * Math.sqrt(g.a ** 3 / mu),
    eccentricity: g.e,
  }
}

export function orbitPath(r: Readonly<Vec3>, v: Readonly<Vec3>): { points: Vec3[]; perigee: Vec3 | null; apogee: Vec3 | null } {
  const g = geometry([...r], [...v])
  if (!g) return { points: [], perigee: null, apogee: null }
  const near = g.p / (1 + g.e)
  const far = g.a === null ? null : g.a * (1 + g.e)
  const perigee = scale(g.peri, near)
  const apogee = far === null ? null : scale(g.peri, -far)
  if (far === null || far < earthRadiusM) return { points: [], perigee, apogee }
  // Clip suborbital ellipses to the above-ground arc instead of drawing a
  // misleading line through the Earth. Keep the osculating perigee marker.
  const from = near >= earthRadiusM || g.e < epsilon ? 0
    : Math.acos(clamp((g.p / earthRadiusM - 1) / g.e, -1, 1))
  const segments = 180
  const points = Array.from({ length: segments + 1 }, (_, i) => {
    const theta = from + (tau - 2 * from) * i / segments
    const c = Math.cos(theta), s = Math.sin(theta)
    return scale(add(scale(g.peri, c), scale(g.side, s)), g.p / (1 + g.e * c))
  })
  return { points, perigee, apogee }
}

// Analytic two-body propagation is deterministic for long seeks and never
// accumulates integration error through the 20+ hours of coast.
export function keplerFrom(state: State, epoch: number): (time: number) => State {
  const g = geometry(state.r, state.v)
  if (!g || g.a === null) throw new Error('La propagación local requiere una elipse no degenerada')
  const { a, e, peri, side } = g
  const ellipticY = Math.sqrt(1 - e * e)
  const e0 = Math.atan2(dot(state.r, side) / ellipticY, dot(state.r, peri) + a * e)
  const m0 = e0 - e * Math.sin(e0)
  const n = Math.sqrt(mu / a ** 3)
  return time => {
    if (time === epoch) return { r: [...state.r], v: [...state.v] }
    const mean = (m0 + n * (time - epoch)) % tau
    let anomaly = mean
    for (let i = 0; i < 16; i++) {
      const correction = (anomaly - e * Math.sin(anomaly) - mean) / (1 - e * Math.cos(anomaly))
      anomaly -= correction
      if (Math.abs(correction) < 1e-13) break
    }
    const c = Math.cos(anomaly), s = Math.sin(anomaly)
    return {
      r: add(scale(peri, a * (c - e)), scale(side, a * ellipticY * s)),
      v: scale(add(scale(peri, -s), scale(side, ellipticY * c)), n * a / (1 - e * c)),
    }
  }
}

function step({ r, v }: State, dt: number, burnAcceleration: Vec3): State {
  const acc = (at: Vec3) => add(gravity(at), burnAcceleration)
  const a = acc(r)
  const bV = add(v, scale(a, dt / 2)), bA = acc(add(r, scale(v, dt / 2)))
  const cV = add(v, scale(bA, dt / 2)), cA = acc(add(r, scale(bV, dt / 2)))
  const dV = add(v, scale(cA, dt)), dA = acc(add(r, scale(cV, dt)))
  const integrate = (x: Vec3, a1: Vec3, a2: Vec3, a3: Vec3, a4: Vec3) =>
    add(x, scale(add(add(a1, a4), scale(add(a2, a3), 2)), dt / 6))
  return { r: integrate(r, v, bV, cV, dV), v: integrate(v, a, bA, cA, dA) }
}

export function constantBurn(initial: State, from: number, to: number, deltaV: Vec3, maxStep: number) {
  const count = Math.ceil(Math.abs(to - from) / maxStep)
  const dt = (to - from) / count
  const acceleration = scale(deltaV, 1 / Math.abs(to - from))
  const states = [initial]
  for (let i = 0; i < count; i++) states.push(step(states[i], dt, acceleration))
  return (t: number): State => {
    const i = clamp(Math.floor((t - from) / dt), 0, count)
    return i === count ? states[i] : step(states[i], t - (from + i * dt), acceleration)
  }
}
