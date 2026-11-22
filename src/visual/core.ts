// Single door to the simulation core. The visuals read state from here and never rebuild it.
import * as core from '../core'

export { flight, duration, eventAt, orbitPath, earthRadiusM, burnDeltaV, entryHandoff } from '../core'

export type Sample = ReturnType<typeof core.sample>
export type VehicleState = Sample['ship']
export type TimelineEvent = (typeof core.flight.timeline)[number]
export type Vec3 = readonly [number, number, number]
export type Confidence = TimelineEvent['confidence'] | 'unknown'

/** Core state at mission time t (clamped by the core). */
export function frameAt(t: number): Sample {
  return core.sample(t)
}

export function eventTime(id: string): number {
  const e = core.flight.timeline.find((x) => x.id === id)
  if (!e) throw new Error(`Missing event ${id} in the timeline`)
  return e.t_sec
}
