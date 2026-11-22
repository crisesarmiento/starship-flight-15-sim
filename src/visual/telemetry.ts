import { eventTime, flight, type Sample } from './core'
import { measuredFrom } from './dimensions'
import { fmtAltitude, fmtDistance, fmtDeg, fmtEcc, fmtG, fmtKm, fmtLat, fmtLon, fmtMassT, fmtPeriod, fmtSpeed } from './format'
import type { BadgeKind } from './labels'

export type HudVehicle = 'ship' | 'booster'

export interface Row {
  key: string
  label: string
  value: string
  badge: BadgeKind
  hint?: string
}

const m = measuredFrom(flight)
const v = flight.vehicle
const T = {
  meco: eventTime('meco'),
  boostbackStart: eventTime('boostback_start'),
  boostbackEnd: eventTime('boostback_shutdown'),
  landingStart: eventTime('booster_landing_burn_start'),
  landingEnd: eventTime('booster_landing_burn_shutdown'),
  insStart: eventTime('insertion_start'),
  insEnd: eventTime('insertion_shutdown'),
  deStart: eventTime('deorbit_start'),
  deEnd: eventTime('deorbit_shutdown'),
  shipLanding: eventTime('ship_landing_burn_start'),
  catch: eventTime('ship_catch'),
}

/** Status words from the core, in English for the screen. Unknown words are shown as they come. */
export const STATUS_EN: Record<string, string> = {
  stack: 'stack ascending',
  ascent: 'ascent',
  coast: 'initial coast',
  insertion: 'orbital insertion',
  orbit: 'in orbit',
  deorbit: 'deorbit',
  'pre-entry': 'on the way to entry',
  entry: 'entry',
  'landing-burn': 'landing burn',
  caught: 'caught by the tower',
  separated: 'separated',
  boostback: 'boostback',
  divert: 'divert to the Gulf',
  fts: 'terminated by FTS',
}
export const statusEn = (status: string): string => STATUS_EN[status] ?? status

/**
 * How a state value was made, read from the core's own method text:
 * - "cinematic" / "illustrative": a drawn curve between knots -> Interpolated
 * - "adjust", "anchor", "estimat", "fixed pulse": a physical model pinned to a reference or with a fixed estimate -> Estimated
 * - otherwise integrated or Keplerian from (r, v) -> Calculated
 */
export function stateBadge(method: string): BadgeKind {
  if (/cinematic|illustrativ/i.test(method)) return 'interpolated'
  if (/adjust|anchor|estimat|fixed pulse/i.test(method)) return 'estimate'
  return 'calculated'
}

const BADGE_HINT: Partial<Record<BadgeKind, string>> = {
  interpolated: 'Interpolated: cinematic curve between points, not physics or telemetry',
  estimate: 'Estimated: physical model tuned to a reference or with an estimated pulse',
  calculated: 'Calculated by the core from the state (r, v)',
}

interface EngineBadge {
  badge: BadgeKind
  hint: string
}

export function engineBadge(who: HudVehicle, t: number): EngineBadge {
  if (who === 'booster') {
    if (t >= T.meco && t < T.boostbackStart) return { badge: 'estimate', hint: 'Estimated: after MECO 3 engines remain in the model; the figure is not published' }
    if (t >= T.boostbackStart && t < T.boostbackEnd) return { badge: v.booster.boostback_engines_lit.confidence, hint: 'SpaceX: 32 of 33 engines lit in the boostback' }
    if (t >= T.landingStart && t < T.landingEnd) return { badge: v.booster.landing_burn_engines.confidence, hint: 'Webcast coverage: 13 engines' }
  } else {
    if (t >= T.insStart && t < T.insEnd) return { badge: v.ship.insertion_engines.confidence, hint: 'A single Raptor in the insertion' }
    if (t >= T.deStart && t < T.deEnd) return { badge: v.ship.deorbit_engines.confidence, hint: 'One sea-level Raptor' }
    if (t >= T.shipLanding && t <= T.catch) return { badge: v.ship.landing_burn_engine_sequence.confidence, hint: 'SpaceX 3, 2, 1 sequence' }
  }
  return { badge: 'timeline', hint: 'Per the timeline events' }
}

const none = (key: string, label: string, hint: string): Row => ({ key, label, value: '—', badge: 'nodata', hint })

/** HUD rows for one vehicle. A value that the core does not have shows "—", never a made-up number. */
export function telemetryRows(s: Sample, who: HudVehicle): Row[] {
  const st = s[who]
  const b = stateBadge(st.method)
  const hint = `${BADGE_HINT[b] ?? ''}. Method: ${st.method}`
  const eng = engineBadge(who, s.time)
  const orbit = who === 'ship' ? s.orbit : null
  const total = who === 'ship' ? m.shipSeaLevel + m.shipVacuum : m.boosterEngines
  const lit = who === 'ship' ? s.shipEngines : s.boosterEngines
  const o = (key: string, label: string, text: (x: Sample['orbit']) => string): Row =>
    orbit ? { key, label, value: text(orbit), badge: 'calculated', hint: b === 'calculated' ? BADGE_HINT.calculated : `${BADGE_HINT.calculated}; the source state is ${b === 'interpolated' ? 'interpolated' : 'estimated'}` } : none(key, label, 'The orbit is calculated only for the Ship')
  return [
    { key: 'alt', label: 'Altitude', value: fmtAltitude(st.altitudeM), badge: b, hint },
    { key: 'vs', label: 'Surface speed', value: fmtSpeed(st.surfaceSpeedMs), badge: b, hint },
    { key: 'vi', label: 'Inertial speed', value: fmtSpeed(st.inertialSpeedMs), badge: b, hint },
    { key: 'dr', label: 'Downrange', value: fmtDistance(st.downrangeM), badge: b, hint },
    { key: 'g', label: 'Acceleration', value: fmtG(st.accelerationG), badge: b, hint },
    st.propellantKg === null
      ? none('prop', 'Propellant', 'The actual propellant load and the dry mass are not published')
      : { key: 'prop', label: 'Propellant', value: fmtMassT(st.propellantKg), badge: 'estimate', hint: 'Estimated: the actual load is not published' },
    { key: 'eng', label: 'Engines', value: `${lit} / ${total}`, badge: eng.badge, hint: eng.hint },
    { key: 'lat', label: 'Latitude', value: fmtLat(st.latitudeDeg), badge: b, hint },
    { key: 'lon', label: 'Longitude', value: fmtLon(st.longitudeDeg), badge: b, hint },
    o('peri', 'Perigee', (x) => fmtKm(x.perigeeM)),
    o('apo', 'Apogee', (x) => fmtKm(x.apogeeM)),
    o('inc', 'Inclination', (x) => fmtDeg(x.inclinationDeg)),
    o('per', 'Period', (x) => fmtPeriod(x.periodS)),
    o('ecc', 'Eccentricity', (x) => fmtEcc(x.eccentricity)),
  ]
}

export function methodLine(s: Sample, who: HudVehicle): string {
  return `${s[who].method} · status: ${statusEn(s[who].status)}`
}

/** Warning for the live orbit: below the surface or inside the atmosphere. */
export function orbitWarning(s: Sample): string | null {
  const p = s.orbit.perigeeM
  if (p === null || !Number.isFinite(p) || s.ship.altitudeM < 1000) return null
  if (p < 0) return `Suborbital trajectory: the perigee (${fmtKm(p)}) is below the surface`
  if (p < 100_000) return `The perigee (${fmtKm(p)}) is inside the atmosphere`
  return null
}
