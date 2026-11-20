import { flight, type TimelineEvent } from './flight'

export { flight }

export const duration = flight.timeline[flight.timeline.length - 1].t_sec
export const altitudeNote = 'Altitud esquemática de la Ship/stack: interpolación visual, no telemetría.'
export const engineNote = 'Motores: recuentos publicados donde existen y transiciones esquemáticas; MECO y hot-staging simplificados.'

function requireEvent(id: string): TimelineEvent {
  const event = flight.timeline.find(candidate => candidate.id === id)
  if (!event) throw new Error(`Falta el evento ${id}`)
  return event
}

const timeAt = (id: string) => requireEvent(id).t_sec

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

const staging = requireEvent('hot_staging')
const stagingAltitudeM = staging.altitude_m?.value
if (stagingAltitudeM == null) throw new Error('Falta la referencia de altitud en la separación')

const orbitAltitudeM = flight.mission.orbit.altitude_km.value * 1000
// These are knots for the visual placeholder, not estimates of altitude at
// otherwise unknown events. The endpoints use the visual pad datum.
const altitudeKnots = [
  [0, 0],
  [staging.t_sec, stagingAltitudeM],
  [timeAt('insertion_shutdown'), orbitAltitudeM],
  [timeAt('deorbit_shutdown'), orbitAltitudeM],
  [duration, 0],
] as const

function schematicAltitude(time: number): number {
  for (let i = 1; i < altitudeKnots.length; i++) {
    const [endTime, endAltitude] = altitudeKnots[i]
    if (time <= endTime) {
      const [startTime, startAltitude] = altitudeKnots[i - 1]
      return startAltitude + (endAltitude - startAltitude) * (time - startTime) / (endTime - startTime)
    }
  }
  return 0
}

const { booster, ship } = flight.vehicle
const [landingStart, landingMid, landingEnd] = ship.landing_burn_engine_sequence.value

const boosterTransitions = [
  [0, booster.engine_count.value],
  [timeAt('meco'), 3], // Visual approximation: MECO cuts most, not all.
  [timeAt('boostback_start'), booster.boostback_engines_lit.value],
  [timeAt('boostback_shutdown'), 0],
  [timeAt('booster_landing_burn_start'), booster.landing_burn_engines.value],
  [timeAt('booster_landing_burn_shutdown'), 0],
] as const

const shipTransitions = [
  [staging.t_sec, ship.sea_level_engines.value + ship.vacuum_engines.value],
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

export function sample(t: number): {
  time: number
  altitudeM: number
  boosterEngines: number
  shipEngines: number
  event: (typeof flight.timeline)[number]
} {
  const time = clampTime(t)
  return {
    time,
    altitudeM: schematicAltitude(time),
    boosterEngines: enginesAt(time, boosterTransitions),
    shipEngines: enginesAt(time, shipTransitions),
    event: eventAtClamped(time),
  }
}
