import { beforeAll, describe, expect, it } from 'vitest'
import data from '../../data/flight15.json'
import { earthRadiusM, sample } from '../core'
import { distance, norm, observeMetrics, osculating, referenceAltitude } from './metrics'
import { maybeWriteReport } from './report-output.mjs'
import { renderReport } from './report'
import { observeTimeline, observedTime, references, type TimelineRow } from './timeline'

let rows: TimelineRow[]
let metrics: ReturnType<typeof observeMetrics>
let report: string

beforeAll(() => {
  rows = observeTimeline()
  metrics = observeMetrics(rows)
  report = renderReport(rows, metrics)
  maybeWriteReport(report)
})

function timeOf(id: string): number {
  const time = observedTime(rows.find(row => row.id === id))
  if (time === null) throw new Error(`No unique observation for ${id}`)
  return time
}

function required<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`No sample for ${label}`)
  return value
}

function within(label: string, actual: number | null, expected: number, tolerance: number) {
  const value = required(actual, label)
  expect(Number.isFinite(value), label).toBe(true)
  expect(Math.abs(value - expected), label).toBeLessThanOrEqual(tolerance)
}

describe('Imposed clock and scheduled effects', () => {
  it('lists all 26 public milestones and FTS in the published order and at the published T+ times', () => {
    expect(references).toHaveLength(27)
    expect(data.timeline.map(event => [event.id, event.t_sec]))
      .toEqual(references.map(ref => [ref.id, ref.time]))
  })

  it.each(references)('$id: imposed marker and scheduled effects match the public window (±$tolerance s)', ({ id }) => {
    const row = rows.find(candidate => candidate.id === id)!
    const allEvidence = [...(row.clock ? [row.clock] : []), ...row.effects]
    for (const { label, transitions } of allEvidence) {
      expect(transitions, `${id} · ${label}: expected exactly one transition in the window`).toHaveLength(1)
      within(`${id} · ${label} (s)`, transitions[0].time, row.time, row.tolerance)
    }
  })

  it('begins ascending after the initial liftoff state', () => {
    const initial = sample(timeOf('liftoff'))
    const ascending = sample(initial.time + 2)
    expect(initial.shipEngines).toBe(0)
    expect(ascending.booster.altitudeM).toBeGreaterThan(initial.booster.altitudeM)
  })
})

describe('Trajectory prediction: raw staging only', () => {
  it('compares the raw staging altitude before radial correction to the reported 65 km', () => {
    within('Raw staging altitude (m)', metrics.stagingRawM, referenceAltitude.staging, 10_000)
  })
})

describe('Model anchors', () => {
  it('applies the 65 km staging altitude anchor after radial correction', () => {
    const staging = required(metrics.staging, 'staging')
    within('Adjusted staging altitude against its anchor (m)', staging.ship.altitudeM, referenceAltitude.staging, 10_000)
  })

  it('applies the 275 km post-insertion altitude anchor to the circular orbit and its perigee', () => {
    const after = required(metrics.insertionAfter, 'post-insertion')
    within('Post-insertion altitude against its anchor (m)', after.ship.altitudeM, referenceAltitude.orbit, 15_000)
    within('Post-insertion perigee derived from the anchored orbit (m)', after.orbit.perigeeM, referenceAltitude.orbit, 15_000)
  })

  it('reports the 92 m/s insertion Δv anchor', () => {
    expect(metrics.burns.find(burn => burn.id === 'insertion_start')?.deltaV).toBe(92)
  })
})

describe('Trajectory and orbital consistency', () => {
  it('derives staging altitude from the staging position vector', () => {
    const staging = required(metrics.staging, 'staging')
    within('Altitude derived from the staging position vector (m)', norm(staging.ship.r) - earthRadiusM, staging.ship.altitudeM, 1)
  })

  it('raises perigee during insertion and matches orbital elements independently derived from r and v', () => {
    const before = required(metrics.insertionBefore, 'pre-insertion')
    const after = required(metrics.insertionAfter, 'post-insertion')
    const beforeOrbit = osculating(before.ship)
    const afterOrbit = osculating(after.ship)
    expect(beforeOrbit.perigeeM, 'Suborbital perigee before insertion').toBeLessThan(120_000)
    expect(afterOrbit.energy, 'Orbital energy increases').toBeGreaterThan(beforeOrbit.energy)
    expect(afterOrbit.perigeeM, 'Perigee rises').toBeGreaterThan(beforeOrbit.perigeeM)
    within('Altitude derived from the post-insertion state (m)', afterOrbit.radius - earthRadiusM, after.ship.altitudeM, 1)
    within('Perigee calculated from r and v (m)', after.orbit.perigeeM, afterOrbit.perigeeM, 1)
    within('Apogee calculated from r and v (m)', after.orbit.apogeeM, afterOrbit.apogeeM, 1)
    within('Inclination calculated from r and v (°)', after.orbit.inclinationDeg, afterOrbit.inclinationDeg, 0.001)
    within('Period calculated from r and v (s)', after.orbit.periodS, afterOrbit.periodS, 0.01)
    within('Eccentricity calculated from r and v', after.orbit.eccentricity, afterOrbit.eccentricity, 0.00001)
  })

  it('lowers perigee into the atmosphere during deorbit', () => {
    const before = osculating(required(metrics.deorbitBefore, 'pre-deorbit').ship)
    const after = required(metrics.deorbitAfter, 'post-deorbit')
    const afterOrbit = osculating(after.ship)
    expect(afterOrbit.energy, 'Orbital energy decreases').toBeLessThan(before.energy)
    expect(afterOrbit.perigeeM).toBeLessThan(before.perigeeM)
    expect(afterOrbit.perigeeM, 'Perigee below the simulated entry interface')
      .toBeLessThan(required(metrics.entry, 'entry').ship.altitudeM)
    within('Perigee calculated from r and v (m)', after.orbit.perigeeM, afterOrbit.perigeeM, 1)
  })

  it('declares the cinematic entry cut and matches both observed ECI states', () => {
    const cut = metrics.entryCut
    within('Cut T+ versus the observed entry marker (s)', cut.time, timeOf('entry'), 0.000001)
    within('ECI position discontinuity (m)', cut.distanceM, cut.measuredDistanceM, 0.001)
    within('ECI velocity vector discontinuity (m/s)', cut.velocityGapMs, cut.measuredVelocityGapMs, 0.001)

    const previous = sample(cut.time - 0.0001).ship
    const following = sample(cut.time).ship
    // The first sample is 0.1 ms before the cut, so its position may
    // differ by ~0.8 m at orbital speed. These are consistency bounds,
    // not limits on the size of either discontinuity.
    within('Pre-cut position versus sample (m)', distance(cut.before.r, previous.r), 0, 2)
    within('Pre-cut velocity versus sample (m/s)', distance(cut.before.v, previous.v), 0, 0.01)
    within('Post-cut position versus sample (m)', distance(cut.after.r, following.r), 0, 0.001)
    within('Post-cut velocity versus sample (m/s)', distance(cut.after.v, following.v), 0, 0.001)
  })

  it('reports a positive, finite Δv when the model provides one for a burn', () => {
    for (const { id, deltaV } of metrics.burns) {
      if (deltaV === null) continue
      expect(Number.isFinite(deltaV), id).toBe(true)
      expect(deltaV, id).toBeGreaterThan(0)
    }
  })
})

it('reports the imposed clock, raw trajectory residual and anchors separately', () => {
  const sections = report.split(/^## /m)
  const section = (title: string) => sections.find(part => part.startsWith(`${title}\n`))
  expect(section('Timeline: imposed clock (reloj impuesto)')).toContain('Imposed clock: measured marker')
  const prediction = section('Trajectory prediction: raw staging only')
  expect(prediction?.match(/^\| Raw staging, before guidance \| .+ \| [+-]\d+\.\d{3} \| ±10 km \| (Within|Outside) \|$/gm))
    .toHaveLength(1)
  const anchors = section('Trajectory anchors (anclas)')
  expect(anchors).toContain('| Adjusted staging altitude at Ship ignition | 65 km |')
  expect(anchors).toContain('| Altitude immediately after insertion cutoff | 275 km |')
  expect(anchors).not.toContain('| Residual |')
  const maneuvers = section('Δv of the maneuvers')
  expect(maneuvers).toContain('| `insertion_start` | 92.000 | Anchor: ~92 m/s')
  expect(maneuvers).not.toContain('| Residual')
})

describe('Deployment and mission outcomes', () => {
  it('separates each Starlink exactly once within the window and tracks its state independently afterward', () => {
    const start = timeOf('payload_deploy_start')
    const end = timeOf('payload_deploy_complete')
    const ids = new Set<number>()
    expect(sample(start - 0.01).satellites).toHaveLength(0)
    for (let t = start; t <= end; t = Math.min(t + 1, end)) {
      const current = sample(t).satellites
      const currentIds = new Set(current.map(satellite => satellite.id))
      expect(currentIds.size, `T+${t}: duplicate IDs`).toBe(current.length)
      expect([...ids].every(id => currentIds.has(id)), `T+${t}: a Starlink disappeared`).toBe(true)
      expect(current.length - ids.size, `T+${t}: expected one-at-a-time separations`).toBeLessThanOrEqual(1)
      for (const id of currentIds) ids.add(id)
      if (t === end) break
    }
    expect(ids.size).toBe(26)

    const later = sample(end + 60)
    const next = sample(end + 61)
    expect(later.satellites).toHaveLength(26)
    expect(next.satellites).toHaveLength(26)
    for (const [i, satellite] of later.satellites.entries()) {
      expect(ids.has(satellite.id)).toBe(true)
      expect(Number.isInteger(satellite.id)).toBe(true)
      expect(norm(satellite.r), `Starlink ${satellite.id} is above Earth's surface`).toBeGreaterThan(earthRadiusM)
      expect(norm(satellite.v), `Starlink ${satellite.id} is moving`).toBeGreaterThan(0)
      expect(distance(satellite.r, later.ship.r), `Starlink ${satellite.id} is separate from the Ship`).toBeGreaterThan(0)
      const following = required(next.satellites.find(other => other.id === satellite.id) ?? null, `Starlink ${satellite.id}`)
      expect(distance(satellite.r, following.r), `Starlink ${satellite.id} moves between samples`).toBeGreaterThan(0)
      for (const other of later.satellites.slice(0, i)) {
        expect(distance(satellite.r, other.r), `Starlinks ${satellite.id} and ${other.id} occupy different positions`).toBeGreaterThan(0)
      }
    }
    expect(new Set(later.satellites.map(satellite => satellite.id))).toEqual(ids)
  })

  it('diverts the booster toward the Gulf and reaches FTS at low altitude and speed without a catch', () => {
    const hover = required(metrics.hover, 'pre-FTS')
    const fts = required(metrics.fts, 'FTS')
    const site = required(metrics.hoverSite, 'FTS site')
    expect(site.eastOfPad).toBe(true)
    // Classify as away from the pad; no distance or coordinates are fitted to the actual FTS.
    expect(site.padDistanceM).toBeGreaterThan(100)
    expect(hover.booster.altitudeM).toBeGreaterThan(0)
    expect(hover.booster.altitudeM).toBeLessThan(150)
    expect(hover.booster.surfaceSpeedMs).toBeGreaterThanOrEqual(0)
    expect(hover.booster.surfaceSpeedMs, 'Low speed just before engine shutdown (m/s)').toBeLessThan(25)
    expect(hover.boosterEngines).toBeGreaterThan(0)
    expect(fts.boosterEngines).toBe(0)
    expect(fts.booster.status).toBe('fts')
    const start = timeOf('liftoff')
    for (let t = start; t < fts.time; t++) expect(sample(t).booster.status).not.toBe('caught')
    expect(sample(timeOf('ship_catch')).booster.status).toBe('fts')
  })

  it('shuts down the Ship engines and catches it at Pad 2', () => {
    const caught = required(metrics.caught, 'Ship catch')
    const site = required(metrics.catchSite, 'catch site')
    expect(caught.ship.status).toBe('caught')
    expect(caught.shipEngines).toBe(0)
    // Pedagogical location check, not an as-flown precision claim.
    expect(site.padDistanceM).toBeLessThan(100)
  })
})
