import { add, cross, dot, earthRadiusM, fromFixed, localPoint, norm, scale, sub, toFixed,
  unit, type State, type Vec3 } from './frame'

type Knot = { time: number; direction: Vec3; directionRate: Vec3; altitude: number; verticalSpeed: number }
export type StateProvenance = 'interpolated' | 'estimate' | 'calculated'
export type VehicleState = State & {
  propellantKg: number | null
  method: string
  provenance: StateProvenance
  status: string
}

function fixedKnot(time: number, { r, v }: State): Knot {
  const radius = norm(r)
  const direction = scale(r, 1 / radius)
  const verticalSpeed = dot(direction, v)
  return { time, direction, altitude: radius - earthRadiusM, verticalSpeed,
    directionRate: scale(sub(v, scale(direction, verticalSpeed)), 1 / radius) }
}

export function inertialKnot(time: number, state: State): Knot {
  return fixedKnot(time, toFixed(state, time))
}

export function localKnot(time: number, eastM: number, northM: number, altitudeM: number,
  verticalSpeed = 0, eastSpeed = 0): Knot {
  const r = localPoint(eastM, northM, altitudeM)
  const up = unit(r)
  const east = unit(cross([0, 0, 1], up))
  return fixedKnot(time, { r, v: add(scale(up, verticalSpeed), scale(east, eastSpeed)) })
}

type Hermite = { weights: [number, number, number, number]; rates: [number, number, number, number] }
function hermite(t: number, dt: number): Hermite {
  const x = t / dt, x2 = x * x, x3 = x2 * x
  return {
    weights: [2 * x3 - 3 * x2 + 1, (x3 - 2 * x2 + x) * dt, -2 * x3 + 3 * x2, (x3 - x2) * dt],
    rates: [(6 * x2 - 6 * x) / dt, 3 * x2 - 4 * x + 1, (-6 * x2 + 6 * x) / dt, 3 * x2 - 2 * x],
  }
}

function combine(a: Knot, b: Knot, w: Hermite['weights']) {
  return {
    direction: add(add(scale(a.direction, w[0]), scale(a.directionRate, w[1])),
      add(scale(b.direction, w[2]), scale(b.directionRate, w[3]))),
    radiusPart: a.altitude * w[0] + a.verticalSpeed * w[1] + b.altitude * w[2] + b.verticalSpeed * w[3],
  }
}

// Earth-fixed Hermite interpolation of direction and altitude separately; this
// avoids diving into the globe as straight Cartesian chords would.
export function curveAt(time: number, knots: readonly [Knot, Knot, ...Knot[]]): State {
  const right = knots.findIndex(k => k.time >= time && k !== knots[0])
  const b = knots[right < 0 ? knots.length - 1 : right]
  const a = knots[(right < 0 ? knots.length - 1 : right) - 1]
  const clampedTime = Math.max(a.time, Math.min(time, b.time))
  const { weights, rates } = hermite(clampedTime - a.time, b.time - a.time)
  const { direction: q, radiusPart: altitude } = combine(a, b, weights)
  const { direction: dq, radiusPart: dz } = combine(a, b, rates)
  const n = unit(q)
  const dn = scale(sub(dq, scale(n, dot(n, dq))), 1 / norm(q))
  const radius = earthRadiusM + altitude
  return fromFixed({ r: scale(n, radius), v: add(scale(n, dz), scale(dn, radius)) }, time)
}
