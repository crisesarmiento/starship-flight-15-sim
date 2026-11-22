import { flight, type TimelineEvent } from './flight'
import { ascentAt } from './physics/ascent'
import { boosterAt } from './physics/booster'
import type { VehicleState } from './physics/cinematic'
import { clamp, deg, dot, earthAngleAt, earthRadiusM, g0, gravity, norm, padUp, scale, sub,
  timeAt, toFixed, unit } from './physics/frame'
import { elements } from './physics/orbit'
import { satellitesAt } from './physics/satellites'
import { deorbitDeltaV, insertionDeltaV, shipAt } from './physics/ship'

export { flight }
export { stagingRawAltitudeM, stagingResidualM } from './physics/ascent'
export { earthRadiusM } from './physics/frame'
export { orbitPath } from './physics/orbit'
export { entryHandoff } from './physics/ship'

export const duration = flight.timeline[flight.timeline.length - 1].t_sec
export const altitudeNote = 'Altitude reconstructed by phase (integrated, anchored or cinematic), not telemetry.'
export const engineNote = 'Engines: published counts where available; the post-MECO count is estimated and hot staging is simplified.'

function clampTime(t: number): number {
  return Number.isNaN(t) ? 0 : Math.min(duration, Math.max(0, t))
}

function eventAtClamped(time: number): TimelineEvent {
  // Upper bound: the last recorded event wins when T+ is shared (cut and FTS).
  let lo = 0
  let hi = flight.timeline.length
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (flight.timeline[mid].t_sec <= time) lo = mid + 1
    else hi = mid
  }
  return flight.timeline[lo - 1]
}

export function eventAt(t: number): (typeof flight.timeline)[number] {
  return eventAtClamped(clampTime(t))
}

const stageTime = timeAt('hot_staging')

const { booster, ship } = flight.vehicle
const [landingStart, landingMid, landingEnd] = ship.landing_burn_engine_sequence.value

const boosterTransitions = [
  [0, booster.engine_count.value],
  [timeAt('meco'), flight.model.ascent.post_meco_engines.value],
  [timeAt('boostback_start'), booster.boostback_engines_lit.value],
  [timeAt('boostback_shutdown'), 0],
  [timeAt('booster_landing_burn_start'), booster.landing_burn_engines.value],
  [timeAt('booster_landing_burn_shutdown'), 0],
] as const

const shipTransitions = [
  [stageTime, ship.sea_level_engines.value + ship.vacuum_engines.value],
  [timeAt('ship_ascent_cutoff'), 0],
  [timeAt('insertion_start'), ship.insertion_engines.value],
  [timeAt('insertion_shutdown'), 0],
  [timeAt('deorbit_start'), ship.deorbit_engines.value],
  [timeAt('deorbit_shutdown'), 0],
  [timeAt('ship_landing_burn_start'), landingStart],
  [timeAt('landing_3_to_2'), landingMid],
  [timeAt('landing_2_to_1'), landingEnd],
  [timeAt('ship_catch'), 0],
] as const

function enginesAt(time: number, transitions: readonly (readonly [number, number])[]): number {
  let engines = 0
  for (const [start, count] of transitions) {
    if (time < start) break
    engines = count
  }
  return engines
}

const modelBurns: Readonly<Record<string, number | null>> = {
  ...Object.fromEntries(Object.entries(flight.model.maneuvers).map(([id, datum]) => [id, datum.value])),
  insertion_start: insertionDeltaV,
  deorbit_start: deorbitDeltaV,
}

export function burnDeltaV(eventId: string): number | null {
  return Object.hasOwn(modelBurns, eventId) ? modelBurns[eventId] : null
}

function rawVehicleAt(time: number, vehicle: 'booster' | 'ship'): VehicleState {
  if (time >= stageTime) return vehicle === 'booster' ? boosterAt(time) : shipAt(time)
  const state = ascentAt(time)
  return {
    ...state,
    propellantKg: vehicle === 'booster' ? state.propellantKg : flight.model.ascent.ship_propellant_kg.value,
    method: 'RK4 ascent with radial adjustment toward the reported separation reference; not telemetry',
    status: 'stack',
  }
}

const differences = [...new Set([...flight.timeline.map(e => e.t_sec), flight.model.ship.kepler_join_s.value])]
  .sort((a, b) => a - b)
const sampleStep = flight.model.ascent.step_s.value

function telemetry(time: number, vehicle: 'booster' | 'ship') {
  const state = rawVehicleAt(time, vehicle)
  const fixed = toFixed(state, time)
  const direction = unit(fixed.r)
  const latitudeDeg = Math.atan2(fixed.r[2], Math.hypot(fixed.r[0], fixed.r[1])) / deg
  const longitudeDeg = Math.atan2(fixed.r[1], fixed.r[0]) / deg
  const distance = earthRadiusM * Math.atan2(norm(sub(direction, scale(padUp, dot(direction, padUp)))),
    clamp(dot(direction, padUp), -1, 1))

  // Estimate proper acceleration from the local derivative of v, excluding
  // gravity. Do not average across the modeled switches and cutoffs.
  const next = differences.findIndex(marker => marker > time)
  const previousTime = next === -1 ? duration : differences[next - 1]
  const nextTime = next === -1 ? Infinity : differences[next]
  const a = Math.max(previousTime, time - sampleStep)
  const b = Math.min(nextTime - (nextTime < Infinity ? 1e-6 : 0), time + sampleStep)
  const acceleration = scale(sub(rawVehicleAt(b, vehicle).v, rawVehicleAt(a, vehicle).v), 1 / (b - a))
  return {
    ...state,
    altitudeM: norm(state.r) - earthRadiusM,
    surfaceSpeedMs: norm(fixed.v),
    inertialSpeedMs: norm(state.v),
    downrangeM: distance,
    accelerationG: norm(sub(acceleration, gravity(state.r))) / g0,
    latitudeDeg,
    longitudeDeg,
  }
}

export function sample(t: number) {
  const time = clampTime(t)
  const ship = telemetry(time, 'ship')
  const booster = telemetry(time, 'booster')
  return {
    time,
    altitudeM: ship.altitudeM,
    boosterEngines: enginesAt(time, boosterTransitions),
    shipEngines: enginesAt(time, shipTransitions),
    event: eventAtClamped(time),
    ship,
    booster,
    satellites: satellitesAt(time),
    orbit: elements(ship),
    earthAngleRad: earthAngleAt(time),
  }
}
