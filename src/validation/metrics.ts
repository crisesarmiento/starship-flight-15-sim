import { burnDeltaV, earthRadiusM, entryHandoff, sample, stagingRawAltitudeM } from '../core'
import { observedTime, type Sample, type TimelineRow } from './timeline'

export const referenceAltitude = { staging: 65_000, orbit: 275_000 } as const
export const pad = { latitudeDeg: 25.99677, longitudeDeg: -97.15799 } as const
const mu = 398_600_441_800_000 // WGS 84, m³/s²
const deg = 180 / Math.PI
type Vec = readonly [number, number, number]
export const norm = (v: Vec) => Math.hypot(...v)
export const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export function earthFixed(vehicle: Sample['ship'], earthAngleRad: number) {
  const [x, y, z] = vehicle.r
  const lat = Math.atan2(z, Math.hypot(x, y))
  const lon = Math.atan2(y, x) - earthAngleRad
  const dLat = lat - pad.latitudeDeg / deg
  const dLon = Math.atan2(Math.sin(lon - pad.longitudeDeg / deg), Math.cos(lon - pad.longitudeDeg / deg))
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat) * Math.cos(pad.latitudeDeg / deg) * Math.sin(dLon / 2) ** 2
  return { eastOfPad: dLon > 0, padDistanceM: 2 * earthRadiusM * Math.asin(Math.sqrt(Math.min(1, a))) }
}

export function osculating({ r, v }: Sample['ship']) {
  const radius = norm(r)
  const speed = norm(v)
  const h: Vec = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]
  const energy = speed ** 2 / 2 - mu / radius
  const axis = -mu / (2 * energy)
  const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * norm(h) ** 2 / mu ** 2))
  return {
    energy, radius, speed, eccentricity,
    perigeeM: norm(h) ** 2 / (mu * (1 + eccentricity)) - earthRadiusM,
    apogeeM: axis * (1 + eccentricity) - earthRadiusM,
    inclinationDeg: Math.atan2(Math.hypot(h[0], h[1]), h[2]) * deg,
    periodS: 2 * Math.PI * Math.sqrt(axis ** 3 / mu),
  }
}

const burnIds = [
  'liftoff', 'hot_staging', 'boostback_start', 'booster_landing_burn_start',
  'insertion_start', 'deorbit_start', 'ship_landing_burn_start',
] as const

export function observeMetrics(rows: TimelineRow[]) {
  function at(id: string, offsetS = 0) {
    const time = observedTime(rows.find(row => row.id === id))
    return time === null ? null : sample(time + offsetS)
  }
  const insertionBefore = at('insertion_start', -0.01)
  const insertionAfter = at('insertion_shutdown', 0.01)
  const deorbitBefore = at('deorbit_start', -0.01)
  const deorbitAfter = at('deorbit_shutdown', 0.01)
  const fts = at('booster_fts')
  const hover = at('booster_fts', -0.1)
  const caught = at('ship_catch')

  return {
    stagingRawM: stagingRawAltitudeM,
    staging: at('hot_staging'),
    insertionBefore, insertionAfter, deorbitBefore, deorbitAfter,
    entry: at('entry'), fts, hover, caught,
    hoverSite: hover && earthFixed(hover.booster, hover.earthAngleRad),
    catchSite: caught && earthFixed(caught.ship, caught.earthAngleRad),
    entryCut: {
      ...entryHandoff,
      measuredDistanceM: distance(entryHandoff.before.r, entryHandoff.after.r),
      measuredVelocityGapMs: distance(entryHandoff.before.v, entryHandoff.after.v),
    },
    burns: burnIds.map(id => ({ id, deltaV: burnDeltaV(id) })),
  }
}

export type Metrics = ReturnType<typeof observeMetrics>
