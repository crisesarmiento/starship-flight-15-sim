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

/** Status words from the core, in Spanish for the screen. Unknown words are shown as they come. */
const STATUS_ES: Record<string, string> = {
  stack: 'stack en ascenso',
  ascent: 'ascenso',
  coast: 'costa inicial',
  insertion: 'inserción orbital',
  orbit: 'en órbita',
  deorbit: 'desórbita',
  'pre-entry': 'camino a la entrada',
  entry: 'entrada',
  'landing-burn': 'quema de aterrizaje',
  caught: 'atrapada en la torre',
  separated: 'separado',
  boostback: 'boostback',
  divert: 'desvío al Golfo',
  fts: 'terminado por FTS',
}
export const statusEs = (status: string): string => STATUS_ES[status] ?? status

/**
 * How a state value was made, read from the core's own method text:
 * - "cinematográfic…" / "ilustrativ…": a drawn curve between knots -> Interpolado
 * - "ajuste", "ancla", "estimad", "pulso fijo": a physical model pinned to a reference or with a fixed estimate -> Estimado
 * - otherwise integrated or Keplerian from (r, v) -> Calculado
 */
export function stateBadge(method: string): BadgeKind {
  if (/cinematogr|ilustrativ/i.test(method)) return 'interpolated'
  if (/ajuste|ancla|estimad|pulso fijo/i.test(method)) return 'estimate'
  return 'calculated'
}

const BADGE_HINT: Partial<Record<BadgeKind, string>> = {
  interpolated: 'Interpolado: curva cinematográfica entre puntos, no es física ni telemetría',
  estimate: 'Estimado: modelo físico ajustado a una referencia o con un pulso estimado',
  calculated: 'Calculado por el núcleo a partir del estado (r, v)',
}

interface EngineBadge {
  badge: BadgeKind
  hint: string
}

export function engineBadge(who: HudVehicle, t: number): EngineBadge {
  if (who === 'booster') {
    if (t >= T.meco && t < T.boostbackStart) return { badge: 'estimate', hint: 'Estimado: tras el MECO quedan 3 motores en el modelo; el dato no está publicado' }
    if (t >= T.boostbackStart && t < T.boostbackEnd) return { badge: v.booster.boostback_engines_lit.confidence, hint: 'SpaceX: 32 de 33 motores encendidos en el boostback' }
    if (t >= T.landingStart && t < T.landingEnd) return { badge: v.booster.landing_burn_engines.confidence, hint: 'Cobertura del webcast: 13 motores' }
  } else {
    if (t >= T.insStart && t < T.insEnd) return { badge: v.ship.insertion_engines.confidence, hint: 'Un solo Raptor en la inserción' }
    if (t >= T.deStart && t < T.deEnd) return { badge: v.ship.deorbit_engines.confidence, hint: 'Un Raptor de nivel del mar' }
    if (t >= T.shipLanding && t <= T.catch) return { badge: v.ship.landing_burn_engine_sequence.confidence, hint: 'Secuencia 3, 2, 1 de SpaceX' }
  }
  return { badge: 'timeline', hint: 'Según los eventos de la línea de tiempo' }
}

const none = (key: string, label: string, hint: string): Row => ({ key, label, value: '—', badge: 'nodata', hint })

/** HUD rows for one vehicle. A value that the core does not have shows "—", never a made-up number. */
export function telemetryRows(s: Sample, who: HudVehicle): Row[] {
  const st = s[who]
  const b = stateBadge(st.method)
  const hint = `${BADGE_HINT[b] ?? ''}. Método: ${st.method}`
  const eng = engineBadge(who, s.time)
  const orbit = who === 'ship' ? s.orbit : null
  const total = who === 'ship' ? m.shipSeaLevel + m.shipVacuum : m.boosterEngines
  const lit = who === 'ship' ? s.shipEngines : s.boosterEngines
  const o = (key: string, label: string, text: (x: Sample['orbit']) => string): Row =>
    orbit ? { key, label, value: text(orbit), badge: 'calculated', hint: b === 'calculated' ? BADGE_HINT.calculated : `${BADGE_HINT.calculated}; el estado de origen es ${b === 'interpolated' ? 'interpolado' : 'estimado'}` } : none(key, label, 'La órbita se calcula solo para la Ship')
  return [
    { key: 'alt', label: 'Altitud', value: fmtAltitude(st.altitudeM), badge: b, hint },
    { key: 'vs', label: 'Vel. superficie', value: fmtSpeed(st.surfaceSpeedMs), badge: b, hint },
    { key: 'vi', label: 'Vel. inercial', value: fmtSpeed(st.inertialSpeedMs), badge: b, hint },
    { key: 'dr', label: 'Downrange', value: fmtDistance(st.downrangeM), badge: b, hint },
    { key: 'g', label: 'Aceleración', value: fmtG(st.accelerationG), badge: b, hint },
    st.propellantKg === null
      ? none('prop', 'Propelente', 'La carga real de propelente y la masa seca no están publicadas')
      : { key: 'prop', label: 'Propelente', value: fmtMassT(st.propellantKg), badge: 'estimate', hint: 'Estimado: la carga real no está publicada' },
    { key: 'eng', label: 'Motores', value: `${lit} / ${total}`, badge: eng.badge, hint: eng.hint },
    { key: 'lat', label: 'Latitud', value: fmtLat(st.latitudeDeg), badge: b, hint },
    { key: 'lon', label: 'Longitud', value: fmtLon(st.longitudeDeg), badge: b, hint },
    o('peri', 'Perigeo', (x) => fmtKm(x.perigeeM)),
    o('apo', 'Apogeo', (x) => fmtKm(x.apogeeM)),
    o('inc', 'Inclinación', (x) => fmtDeg(x.inclinationDeg)),
    o('per', 'Período', (x) => fmtPeriod(x.periodS)),
    o('ecc', 'Excentricidad', (x) => fmtEcc(x.eccentricity)),
  ]
}

export function methodLine(s: Sample, who: HudVehicle): string {
  return `${s[who].method} · estado: ${statusEs(s[who].status)}`
}

/** Warning for the live orbit: below the surface or inside the atmosphere. */
export function orbitWarning(s: Sample): string | null {
  const p = s.orbit.perigeeM
  if (p === null || !Number.isFinite(p) || s.ship.altitudeM < 1000) return null
  if (p < 0) return `Trayectoria suborbital: el perigeo (${fmtKm(p)}) está bajo la superficie`
  if (p < 100_000) return `El perigeo (${fmtKm(p)}) queda dentro de la atmósfera`
  return null
}
