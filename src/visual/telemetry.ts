import type { Frame } from './core'
import { altitudeNote, flight } from './core'
import { measuredFrom } from './dimensions'
import { fmtAltitude, fmtDistance, fmtSpeed } from './format'
import type { BadgeKind } from './labels'

export interface Row {
  key: string
  label: string
  value: string
  badge: BadgeKind
  hint?: string
}

const KINDS: BadgeKind[] = ['official', 'reported', 'estimate', 'unknown', 'placeholder', 'timeline', 'calculated', 'nodata']

function num(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null
}

/** If the core starts sending `<key>Confidence` next to a value, the badge follows it. */
function badgeFor(extra: Record<string, unknown>, key: string, fallback: BadgeKind): BadgeKind {
  const v = extra[`${key}Confidence`]
  return typeof v === 'string' && (KINDS as string[]).includes(v) ? (v as BadgeKind) : fallback
}

const m = measuredFrom(flight)

/**
 * Rows of the HUD. A value that the core does not send shows "—" with a "Sin dato" badge,
 * never a made-up number. The altitude is badged as placeholder until the core says otherwise.
 */
export function telemetryRows(frame: Frame): Row[] {
  const x = frame.extra
  const speed = num(x.speedMs)
  const downrange = num(x.downrangeM)
  return [
    {
      key: 'alt',
      label: 'Altitud',
      value: fmtAltitude(frame.altitudeM),
      badge: frame.altitudeM === null ? 'nodata' : badgeFor(x, 'altitude', 'placeholder'),
      hint: altitudeNote ?? 'Curva placeholder del núcleo, no es telemetría',
    },
    {
      key: 'spd',
      label: 'Velocidad',
      value: fmtSpeed(speed),
      badge: speed === null ? 'nodata' : badgeFor(x, 'speed', 'placeholder'),
    },
    {
      key: 'dr',
      label: 'Downrange',
      value: fmtDistance(downrange),
      badge: downrange === null ? 'nodata' : badgeFor(x, 'downrange', 'placeholder'),
    },
    {
      key: 'be',
      label: 'Motores booster',
      value: `${frame.boosterEngines} / ${m.boosterEngines}`,
      badge: 'timeline',
      hint: 'Según los eventos de la línea de tiempo',
    },
    {
      key: 'se',
      label: 'Motores Ship',
      value: `${frame.shipEngines} / ${m.shipSeaLevel + m.shipVacuum}`,
      badge: 'timeline',
      hint: 'Según los eventos de la línea de tiempo',
    },
    { key: 'mass', label: 'Masa', value: 'no modelada', badge: 'nodata', hint: 'Masa seca y carga de propelente no publicadas' },
  ]
}
