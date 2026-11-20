import type { Confidence } from './core'
import type { CameraMode } from './cameraRig'

export const EVENT_LABELS: Record<string, string> = {
  liftoff: 'Despegue',
  max_q: 'Máxima presión dinámica (Max Q)',
  meco: 'Corte de motores del Super Heavy (MECO)',
  hot_staging: 'Separación en caliente (hot-staging)',
  boostback_start: 'Inicio del boostback (32 de 33 motores)',
  boostback_shutdown: 'Fin del boostback, corte anticipado',
  booster_landing_burn_start: 'Quema de aterrizaje del booster (13 motores)',
  booster_landing_burn_shutdown: 'Corte de la quema del booster: hover sobre el Golfo',
  booster_fts: 'FTS del booster: no hubo catch',
  ship_ascent_cutoff: 'Corte de motores de la Ship (SECO)',
  insertion_start: 'Inicio de la quema de inserción orbital',
  insertion_shutdown: 'Fin de la quema de inserción',
  payload_deploy_start: 'Empieza el despliegue de Starlink V3',
  payload_deploy_complete: 'Despliegue completo: 26 Starlink V3',
  hawaii_check_early: 'Chequeo de regreso: Hawái (temprano)',
  chile_check: 'Chequeo de regreso: Chile (medio)',
  hawaii_check_final: 'Chequeo de regreso: Hawái (final)',
  deorbit_start: 'Inicio de la quema de desórbita',
  deorbit_shutdown: 'Fin de la quema de desórbita',
  entry: 'Inicio de la reentrada',
  transonic: 'La Ship pasa a régimen transónico',
  subsonic: 'La Ship pasa a régimen subsónico',
  ship_landing_burn_start: 'Quema de aterrizaje de la Ship (3 Raptor)',
  landing_flip: 'Flip de aterrizaje',
  landing_3_to_2: 'Quema de aterrizaje: de 3 a 2 motores',
  landing_2_to_1: 'Quema de aterrizaje: de 2 a 1 motor',
  ship_catch: 'Catch de la Ship en Pad 2',
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
  official: 'Oficial',
  reported: 'Reportado',
  estimate: 'Estimado',
  unknown: 'Sin dato',
  placeholder: 'Placeholder',
  timeline: 'Cronología',
  calculated: 'Calculado',
  interpolated: 'Interpolado',
  nodata: 'Sin dato',
}

/** Events that tell the as-flown outcome and deserve a visual flag in the log. */
export const OUTCOME_KIND: Record<string, 'fts' | 'catch' | undefined> = {
  booster_fts: 'fts',
  ship_catch: 'catch',
}

export const MODE_LABELS: Record<CameraMode, { name: string; key: string; hint: string }> = {
  earth: { name: 'Tierra', key: 'T', hint: 'Tierra entera, rotando' },
  orbit: { name: 'Órbita', key: 'O', hint: 'Mirar la órbita de la Ship desde arriba' },
  ship: { name: 'Ship', key: 'S', hint: 'Seguir a la Ship' },
  booster: { name: 'Booster', key: 'B', hint: 'Seguir al booster' },
  pad: { name: 'Torre', key: 'P', hint: 'Pad 2 y torre de captura' },
  free: { name: 'Libre', key: 'F', hint: 'Cámara libre: congela el foco actual' },
}
