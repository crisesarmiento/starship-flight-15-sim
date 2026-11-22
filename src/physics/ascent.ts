import { flight } from '../flight'
import { add, cross, deg, dot, earthRadiusM, g0, gravity, localPoint, norm, scale,
  spinVelocity, sub, timeAt, unit, type State, type Vec3 } from './frame'

const p = flight.model.ascent
// Payload mass is unpublished and not modeled in this simplified mass budget.
const stackMassKg = p.booster_dry_mass_kg.value + p.ship_dry_mass_kg.value + p.ship_propellant_kg.value
const fullThrustN = flight.vehicle.booster.thrust_tf.value * 1000 * g0
const areaM2 = Math.PI * (flight.vehicle.stack.diameter_m.value / 2) ** 2
const stageTime = timeAt('hot_staging')
const mecoTime = timeAt('meco')
const stagingAnchorM = flight.timeline.find(e => e.id === 'hot_staging')?.altitude_m?.value
if (stagingAnchorM == null) throw new Error('Missing reported hot-staging altitude')

type AscentState = State & { propellantKg: number }
type Derivative = { dr: Vec3; dv: Vec3; fuelRate: number }

const heights = flight.model.atmosphere.geometric_altitude_m.value
const logDensities = flight.model.atmosphere.density_kg_m3.value.map(Math.log)

export function densityAt(altitudeM: number): number {
  const z = Math.max(0, altitudeM)
  let lower = 0, upper = heights.length - 1
  while (upper - lower > 1) {
    const middle = (lower + upper) >>> 1
    if (z < heights[middle]) upper = middle
    else lower = middle
  }
  // Log interpolation inside Table II; above 86 km extend the slope of the
  // final pair to approach vacuum, not the USSA76 upper-atmosphere model.
  const f = (z - heights[lower]) / (heights[upper] - heights[lower])
  return Math.exp(logDensities[lower] + f * (logDensities[upper] - logDensities[lower]))
}

function derivatives(state: AscentState, time: number, thrustN: number): Derivative {
  const up = unit(state.r)
  const east = unit(cross([0, 0, 1], up))
  const x = Math.max(0, (time - p.pitch_start_s.value) / (stageTime - p.pitch_start_s.value))
  const pitch = p.staging_tilt_deg.value * deg * x * x * (3 - 2 * x)
  const direction = add(scale(up, Math.cos(pitch)), scale(east, Math.sin(pitch)))
  const relative = sub(state.v, spinVelocity(state.r))
  const density = densityAt(norm(state.r) - earthRadiusM)
  const drag = scale(relative, -0.5 * density * p.drag_cd.value * areaM2 * norm(relative))
  const mass = stackMassKg + state.propellantKg
  return { dr: state.v, dv: add(gravity(state.r), scale(add(scale(direction, thrustN), drag), 1 / mass)),
    fuelRate: -thrustN / (p.isp_s.value * g0) }
}

function advance(s: AscentState, d: Derivative, dt: number): AscentState {
  return { r: add(s.r, scale(d.dr, dt)), v: add(s.v, scale(d.dv, dt)), propellantKg: s.propellantKg + d.fuelRate * dt }
}

function rk4(s: AscentState, t: number, dt: number): AscentState {
  // Keep each RK4 step on one side of the MECO discontinuity.
  const thrust = t + dt / 2 < mecoTime ? fullThrustN
    : fullThrustN * p.post_meco_engines.value / flight.vehicle.booster.engine_count.value
  const a = derivatives(s, t, thrust)
  const b = derivatives(advance(s, a, dt / 2), t + dt / 2, thrust)
  const c = derivatives(advance(s, b, dt / 2), t + dt / 2, thrust)
  const d = derivatives(advance(s, c, dt), t + dt, thrust)
  return {
    r: add(s.r, scale(add(add(a.dr, d.dr), scale(add(b.dr, c.dr), 2)), dt / 6)),
    v: add(s.v, scale(add(add(a.dv, d.dv), scale(add(b.dv, c.dv), 2)), dt / 6)),
    propellantKg: s.propellantKg + dt / 6 * (a.fuelRate + 2 * (b.fuelRate + c.fuelRate) + d.fuelRate),
  }
}

const stepCount = Math.ceil(stageTime / p.step_s.value)
const dt = stageTime / stepCount
const pad = localPoint(0, 0, 0)
const raw: AscentState[] = [{ r: pad, v: spinVelocity(pad), propellantKg: p.booster_propellant_kg.value }]
for (let step = 0; step < stepCount; step++) raw.push(rk4(raw[step], step * dt, dt))

export const stagingRawAltitudeM = norm(raw[stepCount].r) - earthRadiusM
export const stagingResidualM = stagingRawAltitudeM - stagingAnchorM

export function ascentAt(time: number): AscentState {
  const step = Math.min(Math.floor(time / dt), stepCount)
  const t0 = step * dt
  const s = time <= t0 || step === stepCount ? raw[step] : rk4(raw[step], t0, time - t0)
  const x = time / stageTime
  const correction = -stagingResidualM * x ** 2 * (3 - 2 * x)
  const correctionSpeed = -stagingResidualM * 6 * x * (1 - x) / stageTime
  const radius = norm(s.r)
  const n = scale(s.r, 1 / radius)
  const angular = scale(sub(s.v, scale(n, dot(s.v, n))), correction / radius)
  return {
    r: add(s.r, scale(n, correction)),
    v: add(add(s.v, angular), scale(n, correctionSpeed)),
    propellantKg: s.propellantKg,
  }
}
