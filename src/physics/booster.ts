import { flight } from '../flight'
import { ascentAt } from './ascent'
import { curveAt, inertialKnot, localKnot, type VehicleState } from './cinematic'
import { timeAt } from './frame'

const plan = flight.model.booster
const stageTime = timeAt('hot_staging')
const boostbackStart = timeAt('boostback_start')
const coastTime = timeAt('boostback_shutdown')
const landingTime = timeAt('booster_landing_burn_start')
const ftsTime = timeAt('booster_fts')
const offshore = [plan.offshore_east_m.value, plan.offshore_north_m.value] as const

const knots = [
  inertialKnot(stageTime, ascentAt(stageTime)),
  localKnot(coastTime, plan.coast_east_m.value, plan.coast_north_m.value, plan.coast_apex_altitude_m.value),
  localKnot(landingTime, ...offshore, plan.burn_start_altitude_m.value, plan.burn_start_vertical_speed_ms.value),
  localKnot(ftsTime, ...offshore, plan.hover_altitude_m.value),
] as const

export function boosterAt(time: number): VehicleState {
  return { ...curveAt(time, knots), propellantKg: null,
    method: time >= ftsTime ? 'Cinematic FTS marker; not a vehicle state after the FTS'
      : 'Cinematic curve; illustrative divert and offshore point, no guidance or telemetry',
    provenance: 'interpolated',
    status: time >= ftsTime ? 'fts' : time >= landingTime ? 'landing-burn'
      : time >= coastTime ? 'divert' : time >= boostbackStart ? 'boostback' : 'separated' }
}
