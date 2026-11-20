import { burnDeltaV, eventTime, flight } from './core'
import type { BadgeKind } from './labels'

/**
 * Where a burn's Δv comes from. The core never "calculates" these numbers: they are either a published figure,
 * an estimate fixed by the simulation, or not evaluable. The UI says which one.
 */
export type DvSource =
  | { kind: 'reported'; valueMs: number; source: string; who: string }
  | { kind: 'estimate'; valueMs: number; source: string; note: string }
  | { kind: 'unknown'; note: string }

export interface Maneuver {
  id: string
  label: string
  vehicle: 'booster' | 'ship'
  startId: string
  endId: string
  t0: number
  t1: number
  dv: DvSource
  /** What the core answers for this burn (an input echo for reported/estimate, null for the rest). */
  coreValue: number | null
}

const orbit = flight.mission.orbit.insertion_delta_v_m_s
const deorbit = flight.model.ship.deorbit_delta_v_ms
const notes = flight.model.maneuvers

const unknown = (note: string | undefined): DvSource => ({ kind: 'unknown', note: note ?? 'Δv no publicado; no evaluable.' })

const DEFS: { id: string; label: string; vehicle: 'booster' | 'ship'; start: string; end: string; dv: DvSource }[] = [
  { id: 'liftoff', label: 'Despegue (ascenso del stack, 33 motores)', vehicle: 'booster', start: 'liftoff', end: 'meco', dv: unknown(notes.liftoff.note) },
  { id: 'hot-staging', label: 'Hot-staging y encendido de la Ship', vehicle: 'ship', start: 'hot_staging', end: 'ship_ascent_cutoff', dv: unknown(notes.hot_staging.note) },
  { id: 'boostback', label: 'Boostback del booster (32 de 33 motores)', vehicle: 'booster', start: 'boostback_start', end: 'boostback_shutdown', dv: unknown(notes.boostback_start.note) },
  { id: 'booster-landing', label: 'Quema de aterrizaje del booster (13 motores)', vehicle: 'booster', start: 'booster_landing_burn_start', end: 'booster_landing_burn_shutdown', dv: unknown(notes.booster_landing_burn_start.note) },
  {
    id: 'insertion',
    label: 'Inserción orbital (1 Raptor)',
    vehicle: 'ship',
    start: 'insertion_start',
    end: 'insertion_shutdown',
    dv: { kind: 'reported', valueMs: orbit.value, source: orbit.source, who: 'McDowell, citado en Wikipedia' },
  },
  {
    id: 'deorbit',
    label: 'Desórbita (1 Raptor de nivel del mar)',
    vehicle: 'ship',
    start: 'deorbit_start',
    end: 'deorbit_shutdown',
    dv: { kind: 'estimate', valueMs: deorbit.value, source: deorbit.source, note: deorbit.note ?? 'Pulso fijo de la simulación; no es un Δv publicado.' },
  },
  { id: 'ship-landing', label: 'Quema de aterrizaje de la Ship (3, 2, 1)', vehicle: 'ship', start: 'ship_landing_burn_start', end: 'ship_catch', dv: unknown(notes.ship_landing_burn_start.note) },
]

export function buildManeuvers(): Maneuver[] {
  return DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    vehicle: d.vehicle,
    startId: d.start,
    endId: d.end,
    t0: eventTime(d.start),
    t1: eventTime(d.end),
    dv: d.dv,
    coreValue: burnDeltaV(d.start),
  })).sort((a, b) => a.t0 - b.t0)
}

export function activeManeuver(list: Maneuver[], t: number): Maneuver | null {
  return list.find((m) => t >= m.t0 && t < m.t1) ?? null
}

/** Badge for a Δv: never "Calculado", because these inputs are reported, estimated or not published. */
export function dvBadge(m: Maneuver): BadgeKind {
  return m.dv.kind === 'reported' ? 'reported' : m.dv.kind === 'estimate' ? 'estimate' : 'nodata'
}

export function dvValueText(m: Maneuver): string {
  return m.dv.kind === 'unknown' ? 'no evaluable' : `${Math.round(m.dv.valueMs)} m/s`
}

/** Short label for the scene: value plus who says so. */
export function dvLabel(m: Maneuver): string {
  if (m.dv.kind === 'reported') return `Δv ${dvValueText(m)} (reportado)`
  if (m.dv.kind === 'estimate') return `Δv ${dvValueText(m)} (estimado)`
  return 'Δv no evaluable'
}

export function dvSourceText(m: Maneuver): string {
  if (m.dv.kind === 'reported') return `Fuente: ${m.dv.who}`
  if (m.dv.kind === 'estimate') return `Fuente local: ${m.dv.source} · ${m.dv.note}`
  return m.dv.note
}
