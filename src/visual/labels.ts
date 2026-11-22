import type { Confidence } from './core'
import type { CameraMode } from './cameraRig'

export const EVENT_LABELS: Record<string, string> = {
  liftoff: 'Liftoff',
  max_q: 'Maximum dynamic pressure (Max Q)',
  meco: 'Super Heavy main engine cutoff (MECO)',
  hot_staging: 'Hot-staging separation',
  boostback_start: 'Boostback start (32 of 33 engines)',
  boostback_shutdown: 'Boostback end, early cutoff',
  booster_landing_burn_start: 'Booster landing burn (13 engines)',
  booster_landing_burn_shutdown: 'Booster burn shutdown: hover over the Gulf',
  booster_fts: 'Booster FTS: no catch',
  ship_ascent_cutoff: 'Ship engine cutoff (SECO)',
  insertion_start: 'Orbital insertion burn start',
  insertion_shutdown: 'Insertion burn end',
  payload_deploy_start: 'Starlink V3 deployment begins',
  payload_deploy_complete: 'Deployment complete: 26 Starlink V3',
  hawaii_check_early: 'Return check: Hawaii (early)',
  chile_check: 'Return check: Chile (mid)',
  hawaii_check_final: 'Return check: Hawaii (final)',
  deorbit_start: 'Deorbit burn start',
  deorbit_shutdown: 'Deorbit burn end',
  entry: 'Reentry start',
  transonic: 'Ship goes transonic',
  subsonic: 'Ship goes subsonic',
  ship_landing_burn_start: 'Ship landing burn (3 Raptors)',
  landing_flip: 'Landing flip',
  landing_3_to_2: 'Landing burn: 3 to 2 engines',
  landing_2_to_1: 'Landing burn: 2 to 1 engine',
  ship_catch: 'Ship catch at Pad 2',
}

export const VEHICLE_LABELS: Record<string, string> = {
  stack: 'Stack',
  booster: 'Booster',
  ship: 'Ship',
}

export function eventLabel(id: string | undefined, fallback = ''): string {
  return (id && EVENT_LABELS[id]) || fallback
}

export type BadgeKind = Confidence | 'placeholder' | 'timeline' | 'calculated' | 'interpolated' | 'nodata'

export const BADGE_LABELS: Record<BadgeKind, string> = {
  official: 'Official',
  reported: 'Reported',
  estimate: 'Estimated',
  unknown: 'No data',
  placeholder: 'Placeholder',
  timeline: 'Timeline',
  calculated: 'Calculated',
  interpolated: 'Interpolated',
  nodata: 'No data',
}

/** Events that tell the as-flown outcome and deserve a visual flag in the log. */
export const OUTCOME_KIND: Record<string, 'fts' | 'catch' | undefined> = {
  booster_fts: 'fts',
  ship_catch: 'catch',
}

export const MODE_LABELS: Record<CameraMode, { name: string; key: string; hint: string }> = {
  earth: { name: 'Earth', key: 'T', hint: 'Whole Earth, rotating' },
  orbit: { name: 'Orbit', key: 'O', hint: 'View the Ship orbit from above' },
  ship: { name: 'Ship', key: 'S', hint: 'Follow the Ship' },
  booster: { name: 'Booster', key: 'B', hint: 'Follow the booster' },
  pad: { name: 'Tower', key: 'P', hint: 'Pad 2 and the catch tower' },
  free: { name: 'Free', key: 'F', hint: 'Free camera: freezes the current focus' },
}
