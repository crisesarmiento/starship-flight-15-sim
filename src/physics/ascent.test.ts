import { expect, it } from 'vitest'
import { flight } from '../flight'
import { ascentAt, densityAt, stagingRawAltitudeM, stagingResidualM } from './ascent'
import { earthRadiusM, norm, scale, sub, timeAt } from './frame'

it('integrates ascent, consumes propellant, and exposes the raw residual', () => {
  const start = ascentAt(0)
  const end = ascentAt(timeAt('hot_staging'))
  const anchor = flight.timeline.find(e => e.id === 'hot_staging')!.altitude_m!.value!
  expect(norm(start.r) - earthRadiusM).toBeCloseTo(0)
  expect(end.propellantKg).toBeGreaterThan(0)
  expect(end.propellantKg).toBeLessThan(start.propellantKg)
  expect(stagingRawAltitudeM).toBeGreaterThan(0)
  expect(stagingResidualM).toBe(stagingRawAltitudeM - anchor)
  expect(Math.abs(stagingResidualM)).toBeLessThanOrEqual(10_000)
  expect(Math.abs(norm(end.r) - earthRadiusM - anchor)).toBeLessThan(1e-6)
  expect(norm(sub(end.r, ascentAt(140.999).r))).toBeLessThan(10)
  console.info(`Hot-staging: raw altitude ${stagingRawAltitudeM.toFixed(1)} m; residual ${stagingResidualM.toFixed(1)} m`)
})

it('differentiates the radial correction, including the change in direction', () => {
  const time = 100.03, h = 0.01
  const finiteDifference = scale(sub(ascentAt(time + h).r, ascentAt(time - h).r), 1 / (2 * h))
  expect(norm(sub(finiteDifference, ascentAt(time).v))).toBeLessThan(1e-3)
})

it('matches standard reference densities and trends toward vacuum above 86 km', () => {
  // Cross-check independent of the JSON: PDAS SI geometric-altitude table at
  // 0/30/32/70 km (https://www.pdas.com/atmosTable1SI.html). At 11 km use
  // the PDAS lower-atmosphere equations, evaluated at geometric altitude.
  const references = [[0, 1.225], [11_000, 0.3648], [30_000, 0.01841],
    [32_000, 0.01355], [70_000, 8.281e-5]] as const
  for (const [height, density] of references) {
    expect(Math.abs(densityAt(height) / density - 1), `${height} m`).toBeLessThan(0.003)
  }
  expect(densityAt(-100)).toBeCloseTo(densityAt(0))
  expect(densityAt(85_999)).toBeGreaterThan(densityAt(86_000))
  expect(densityAt(86_001)).toBeLessThan(densityAt(86_000))
  expect(densityAt(100_000)).toBeGreaterThan(0)
  expect(densityAt(100_000)).toBeLessThan(densityAt(86_000))
  expect(Number.isFinite(densityAt(1_000_000))).toBe(true)
  expect(densityAt(1_000_000)).toBeLessThan(densityAt(65_000))
  expect(densityAt(Infinity)).toBe(0)
})

it('uses public ascent timings as fixed event times', () => {
  for (const [id, reference] of [['max_q', 58], ['meco', 139], ['hot_staging', 141]] as const) {
    expect(Math.abs(timeAt(id) - reference)).toBeLessThanOrEqual(2)
  }
})
