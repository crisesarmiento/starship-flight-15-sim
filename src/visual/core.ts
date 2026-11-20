// Single door to the simulation core. If the core changes shape, only this file changes.
import * as core from '../core'

export type Confidence = 'official' | 'reported' | 'estimate' | 'unknown'

export interface Sourced<T = number> {
  value: T | null
  unit?: string
  confidence: Confidence
  source: string | null
  note?: string
}

export interface TimelineEvent {
  id: string
  t_sec: number
  label: string
  vehicle?: string
  confidence: Confidence
  source?: string | null
  as_flown_note?: string | null
  altitude_m?: Sourced | null
}

/** The slice of data/flight15.json that the visuals read. */
export interface FlightData {
  meta: { disclaimer: string; researched_at: string }
  mission: {
    liftoff_utc: Sourced<string>
    payload: { count: Sourced }
    orbit: { orbits_approx: Sourced }
  }
  site: {
    latitude_deg: Sourced
    longitude_deg: Sourced
  }
  vehicle: {
    stack: { height_m: Sourced; diameter_m: Sourced }
    booster: {
      height_m: Sourced
      diameter_m: Sourced
      engine_count: Sourced
      center_maneuverable_engines: Sourced
      perimeter_engines: Sourced
      grid_fins: Sourced
    }
    ship: {
      height_m: Sourced
      diameter_m: Sourced
      sea_level_engines: Sourced
      vacuum_engines: Sourced
    }
  }
  timeline: TimelineEvent[]
}

/** One instant of the core, normalised. Unknown extras are kept in `extra`. */
export interface Frame {
  time: number
  altitudeM: number | null
  boosterEngines: number
  shipEngines: number
  event: TimelineEvent | null
  extra: Record<string, unknown>
}

export const flight = core.flight as unknown as FlightData

const rawDuration: unknown = (core as Record<string, unknown>).duration
const lastEventTime = flight.timeline.reduce((m, e) => Math.max(m, e.t_sec), 0)
export const duration: number =
  typeof rawDuration === 'number' && Number.isFinite(rawDuration) ? rawDuration : lastEventTime

const rawNote: unknown = (core as Record<string, unknown>).altitudeNote
/** Core's own note about how the altitude is made, if it sends one. */
export const altitudeNote: string | null = typeof rawNote === 'string' ? rawNote : null

const byId = new Map(flight.timeline.map((e) => [e.id, e]))

function toEvent(raw: unknown): TimelineEvent | null {
  if (!raw) return null
  if (typeof raw === 'string') return byId.get(raw) ?? null
  const r = raw as Partial<TimelineEvent>
  if (r.id && byId.has(r.id)) return byId.get(r.id)!
  return null
}

/** Last event whose time has passed (ties resolve to the later row). */
export function lastEventBefore(t: number): TimelineEvent | null {
  let found: TimelineEvent | null = null
  for (const e of flight.timeline) if (e.t_sec <= t) found = e
  return found
}

export function currentEvent(t: number): TimelineEvent | null {
  const fn = (core as Record<string, unknown>).eventAt
  const fromCore = typeof fn === 'function' ? toEvent((fn as (t: number) => unknown)(t)) : null
  return fromCore ?? lastEventBefore(t)
}

const KNOWN = new Set(['time', 'altitudeM', 'boosterEngines', 'shipEngines', 'event'])

export function frameAt(t: number): Frame {
  const clamped = Math.min(Math.max(t, 0), duration)
  const s = core.sample(clamped) as unknown as Record<string, unknown>
  const extra: Record<string, unknown> = {}
  for (const k of Object.keys(s)) if (!KNOWN.has(k)) extra[k] = s[k]
  const alt = s.altitudeM
  return {
    time: clamped,
    altitudeM: typeof alt === 'number' && Number.isFinite(alt) ? alt : null,
    boosterEngines: Number(s.boosterEngines) || 0,
    shipEngines: Number(s.shipEngines) || 0,
    event: toEvent(s.event) ?? currentEvent(clamped),
    extra,
  }
}
