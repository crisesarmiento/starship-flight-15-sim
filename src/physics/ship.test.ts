import { expect, it } from 'vitest'
import { flight } from '../flight'
import { dot, earthRadiusM, localPoint, norm, sub, timeAt, toFixed, unit } from './frame'
import { elements } from './orbit'
import { entryHandoff, shipAt } from './ship'

it('keeps r/v continuous at joins, changes perigee, and preserves Keplerian coast', () => {
  const join = flight.model.ship.kepler_join_s.value
  for (const t of [timeAt('ship_ascent_cutoff'), join, 1570, 1590, 77757, 77767]) {
    expect(norm(sub(shipAt(t - 0.001).r, shipAt(t + 0.001).r)), `${t}: r`).toBeLessThan(20)
    expect(norm(sub(shipAt(t - 0.001).v, shipAt(t + 0.001).v)), `${t}: v`).toBeLessThan(1)
  }
  const before = elements(shipAt(1570))
  const inserted = elements(shipAt(1590))
  const after = elements(shipAt(77767))
  expect(before.perigeeM!).toBeLessThan(0)
  expect(Math.abs(inserted.perigeeM! - 275_000)).toBeLessThan(15_000)
  expect(Math.abs(norm(shipAt(1590).r) - earthRadiusM - 275_000)).toBeLessThan(15_000)
  expect(after.perigeeM!).toBeLessThan(100_000)
  expect(elements(shipAt(74_515)).periodS).toBeCloseTo(inserted.periodS!, 6)
  expect(elements(shipAt(79_845)).perigeeM).toBeCloseTo(after.perigeeM!, 4)
  expect(norm(shipAt(79_846).r) - earthRadiusM).toBeGreaterThan(0)
  console.info(`Perigees before insertion, after insertion, and after deorbit: ${[before, inserted, after].map(o => o.perigeeM!.toFixed(0)).join(' / ')} m`)
})

it('moves east during the ascent bridge without passing back over the pad', () => {
  const intervals = [141, 489, flight.model.ship.kepler_join_s.value, 1570, 1590]
  const longitude = (t: number) => {
    const { r } = toFixed(shipAt(t), t)
    return Math.atan2(r[1], r[0])
  }
  for (let i = 1; i < intervals.length; i++) {
    const a = intervals[i - 1], b = intervals[i]
    for (let s = 1; s <= 40; s++) {
      const step = (b - a) / 40
      const difference = longitude(a + s * step) - longitude(a + (s - 1) * step)
      expect(Math.atan2(Math.sin(difference), Math.cos(difference)), `${a}–${b}, ${s}`).toBeGreaterThan(0)
    }
  }
})

it('declares the entry cut and uses descending local segments without spikes or reversals', () => {
  const entry = timeAt('entry')
  expect(entryHandoff.time).toBe(entry)
  expect(norm(sub(shipAt(entry - 0.001).r, entryHandoff.before.r))).toBeLessThan(10)
  expect(norm(sub(shipAt(entry).r, entryHandoff.after.r))).toBeLessThan(1e-6)
  expect(entryHandoff.distanceM).toBeGreaterThan(1_000)
  expect(entryHandoff.velocityGapMs).toBeGreaterThan(1_000)
  expect(norm(entryHandoff.before.r)).toBeCloseTo(norm(entryHandoff.after.r), 5)
  expect(shipAt(entry).method).toMatch(/explicit position and velocity cut/)
  const times = [entry, 80974, 81013, 81136, 81138, 81154]
  const ceilings = [2500, 400, 350, 110, 100]
  const floors = [250, 200, 50, 35, 0]
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1], b = times[i]
    for (let s = 0; s < 40; s++) {
      const t = a + (b - a) * s / 40
      const fixed = toFixed(shipAt(t), t)
      const speed = norm(fixed.v)
      expect(speed, `${t}: |v|`).toBeLessThan(ceilings[i - 1])
      expect(speed, `${t}: |v|`).toBeGreaterThan(floors[i - 1])
      expect(dot(unit(fixed.r), fixed.v), `${t}: radial`).toBeLessThan(0)
      const longitudeRateSign = fixed.r[0] * fixed.v[1] - fixed.r[1] * fixed.v[0]
      expect(longitudeRateSign, `${t}: westward`).toBeLessThan(0)
    }
  }
  console.info(`Entry cut: Δr ${entryHandoff.distanceM.toFixed(0)} m; vector Δv ${entryHandoff.velocityGapMs.toFixed(0)} m/s`)
})

it('preserves public timing windows and ends with a catch on land at Pad 2', () => {
  for (const [id, reference, tolerance] of [
    ['ship_ascent_cutoff', 489, 2], ['insertion_start', 1570, 5], ['insertion_shutdown', 1590, 5],
    ['payload_deploy_start', 2101, 5], ['payload_deploy_complete', 4660, 5],
    ['hawaii_check_early', 5266, 15], ['chile_check', 26135, 15], ['hawaii_check_final', 74515, 15],
    ['deorbit_start', 77757, 15], ['deorbit_shutdown', 77767, 15], ['entry', 79846, 5],
    ['transonic', 80974, 5], ['subsonic', 81013, 5], ['ship_landing_burn_start', 81136, 5],
    ['landing_flip', 81138, 5], ['landing_3_to_2', 81146, 5], ['landing_2_to_1', 81153, 5],
    ['ship_catch', 81154, 5],
  ] as const) expect(Math.abs(timeAt(id) - reference)).toBeLessThanOrEqual(tolerance)
  expect(shipAt(81153.999).status).toBe('landing-burn')
  const caught = shipAt(81154)
  expect(caught.status).toBe('caught')
  const fixed = toFixed(caught, 81154)
  expect(norm(sub(fixed.r, localPoint(0, 0, flight.model.ship.catch_altitude_m.value)))).toBeLessThan(1e-6)
  expect(norm(fixed.v)).toBeLessThan(1e-6)
})
