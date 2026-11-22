import { flight } from '../flight'
import { ascentAt } from './ascent'
import { curveAt, inertialKnot, localKnot, type VehicleState } from './cinematic'
import { add, earthAngleAt, earthRadiusM, mu, norm, padEast, padUp, rotate, scale, sub,
  timeAt, unit, type State } from './frame'
import { constantBurn, keplerFrom } from './orbit'

const plan = flight.model.ship
const stage = timeAt('hot_staging'), seco = timeAt('ship_ascent_cutoff'), join = plan.kepler_join_s.value
const insertionStart = timeAt('insertion_start'), insertionEnd = timeAt('insertion_shutdown')
const deorbitStart = timeAt('deorbit_start'), deorbitEnd = timeAt('deorbit_shutdown')
const entry = timeAt('entry'), landing = timeAt('ship_landing_burn_start'), catchTime = timeAt('ship_catch')
const stepS = flight.model.ascent.step_s.value
const radius = earthRadiusM + 1000 * flight.mission.orbit.altitude_km.value
// Eastward illustrative orbital plane, not a determination of flown azimuth,
// inclination, or epoch. The terminal insertion state is a model anchor.
const phase = plan.insertion_anchor_east_m.value / earthRadiusM
const phaseUp = add(scale(padUp, Math.cos(phase)), scale(padEast, Math.sin(phase)))
const phaseEast = add(scale(padUp, -Math.sin(phase)), scale(padEast, Math.cos(phase)))
const endOfInsertion: State = {
  r: scale(rotate(phaseUp, earthAngleAt(insertionEnd)), radius),
  v: scale(rotate(phaseEast, earthAngleAt(insertionEnd)), Math.sqrt(mu / radius)),
}

export const insertionDeltaV = flight.mission.orbit.insertion_delta_v_m_s.value
export const deorbitDeltaV = plan.deorbit_delta_v_ms.value

const insertion = constantBurn(endOfInsertion, insertionEnd, insertionStart,
  scale(unit(endOfInsertion.v), insertionDeltaV), stepS)
const preInsertion = keplerFrom(insertion(insertionStart), insertionStart)
const orbitalCoast = keplerFrom(endOfInsertion, insertionEnd)
const beginDeorbit = orbitalCoast(deorbitStart)
const deorbit = constantBurn(beginDeorbit, deorbitStart, deorbitEnd,
  scale(unit(beginDeorbit.v), -deorbitDeltaV), stepS)
const preEntry = keplerFrom(deorbit(deorbitEnd), deorbitEnd)

const ascentKnots = [
  inertialKnot(stage, ascentAt(stage)),
  localKnot(seco, plan.seco_east_m.value, 0, plan.seco_altitude_m.value, 0, plan.seco_east_speed_ms.value),
  inertialKnot(join, preInsertion(join)),
] as const

const beforeEntryCut = preEntry(entry)
const entryKnots = [
  localKnot(entry, plan.entry_east_m.value, plan.return_north_m.value, norm(beforeEntryCut.r) - earthRadiusM,
    plan.entry_vertical_speed_ms.value, plan.entry_east_speed_ms.value),
  localKnot(timeAt('transonic'), plan.transonic_east_m.value, plan.transonic_north_m.value, plan.transonic_altitude_m.value,
    plan.transonic_vertical_speed_ms.value, plan.transonic_east_speed_ms.value),
  localKnot(timeAt('subsonic'), plan.return_east_m.value, plan.return_north_m.value, plan.subsonic_altitude_m.value,
    plan.subsonic_vertical_speed_ms.value, plan.subsonic_east_speed_ms.value),
  localKnot(landing, plan.landing_start_east_m.value, 0, plan.landing_start_altitude_m.value,
    plan.landing_start_vertical_speed_ms.value, plan.landing_start_east_speed_ms.value),
  localKnot(timeAt('landing_flip'), plan.flip_east_m.value, 0, plan.flip_altitude_m.value,
    plan.flip_vertical_speed_ms.value, plan.flip_east_speed_ms.value),
  localKnot(catchTime, 0, 0, plan.catch_altitude_m.value),
] as const

const afterEntryCut = curveAt(entry, entryKnots)
export const entryHandoff = {
  time: entry,
  before: beforeEntryCut,
  after: afterEntryCut,
  distanceM: norm(sub(afterEntryCut.r, beforeEntryCut.r)),
  velocityGapMs: norm(sub(afterEntryCut.v, beforeEntryCut.v)),
}

export function shipAt(time: number): VehicleState {
  function out(state: State, method: string, status: string): VehicleState {
    return { ...state, method, status, propellantKg: null }
  }
  if (time < join) return out(curveAt(time, ascentKnots),
    'Cinematic Ship ascent bridge and initial coast; not telemetry', time < seco ? 'ascent' : 'coast')
  if (time < insertionStart) return out(preInsertion(time), 'Keplerian pre-insertion coast; osculating orbit of the model', 'coast')
  if (time < insertionEnd) return out(insertion(time), 'Integrated insertion, fixed pulse with reported Δv and orbital anchor', 'insertion')
  if (time < deorbitStart) return out(orbitalCoast(time), 'Keplerian coast anchored to the reported orbital altitude', 'orbit')
  if (time < deorbitEnd) return out(deorbit(time), 'Integrated deorbit with an estimated fixed retrograde pulse', 'deorbit')
  if (time < entry) return out(preEntry(time), 'Keplerian coast toward entry; not a prediction of the real corridor', 'pre-entry')
  return out(curveAt(time, entryKnots), 'Local cinematic curve over the Gulf after an explicit position and velocity cut; not telemetry',
    time >= catchTime ? 'caught' : time >= landing ? 'landing-burn' : 'entry')
}
