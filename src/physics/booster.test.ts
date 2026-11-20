import { expect, it } from 'vitest'
import { flight } from '../flight'
import { ascentAt } from './ascent'
import { boosterAt } from './booster'
import { earthRadiusM, localPoint, norm, sub, timeAt, toFixed } from './frame'

it('empalma el ascenso y muestra desvío, hover y FTS sin volver al pad', () => {
  const stageTime = timeAt('hot_staging')
  const separated = boosterAt(stageTime)
  expect(norm(sub(separated.r, ascentAt(stageTime).r))).toBeLessThan(1e-6)
  expect(norm(sub(separated.v, ascentAt(stageTime).v))).toBeLessThan(1e-6)
  for (const [id, reference] of [['boostback_start', 146], ['boostback_shutdown', 182],
    ['booster_landing_burn_start', 370], ['booster_fts', 395]] as const) {
    expect(Math.abs(timeAt(id) - reference)).toBeLessThanOrEqual(2)
  }
  expect(boosterAt(182).status).toBe('divert')
  expect(boosterAt(394.999).status).toBe('landing-burn')
  const fts = boosterAt(395)
  const fixed = toFixed(fts, 395)
  const pad = localPoint(0, 0, 0)
  expect(fts.status).toBe('fts')
  expect(norm(fixed.r) - earthRadiusM).toBeCloseTo(flight.model.booster.hover_altitude_m.value)
  expect(norm(fixed.v)).toBeLessThan(1e-6)
  expect(norm(sub(fixed.r, pad))).toBeGreaterThan(1_000)
  expect(flight.mission.outcomes.booster.splashdown_coordinates.value).toBeNull()
})
