import { describe, expect, it } from 'vitest'
import { altitudeNote, burnDeltaV, duration, earthRadiusM, eventAt, flight, orbitPath, sample } from './core'
import { norm, sub } from './physics/frame'

describe('Flight 15: mission seeking', () => {
  it('resolves each milestone at its exact time and gives FTS priority over engine shutdown at the same time', () => {
    for (const event of flight.timeline) {
      const expectedId = event.id === 'booster_landing_burn_shutdown' ? 'booster_fts' : event.id
      expect(eventAt(event.t_sec).id).toBe(expectedId)
      expect(sample(event.t_sec).event.id).toBe(expectedId)
    }
    expect(eventAt(394.999).id).toBe('booster_landing_burn_start')
    expect(eventAt(395).id).toBe('booster_fts')
    expect(eventAt(395.001).id).toBe('booster_fts')
  })

  it('seeks deterministically forward and backward, even outside the mission timeline', () => {
    expect(duration).toBe(81154)
    const descent = sample(81153.5)
    expect(descent).toMatchObject({ time: 81153.5, shipEngines: 1, event: { id: 'landing_2_to_1' } })
    expect(sample(58.5)).toMatchObject({ time: 58.5, event: { id: 'max_q' } })
    expect(sample(81153.5)).toEqual(descent)
    for (const t of [-Infinity, -1, NaN]) expect(sample(t)).toEqual(sample(0))
    for (const t of [duration + 1, Infinity]) expect(sample(t)).toEqual(sample(duration))
  })

  it('identifies altitude as reconstructed and preserves reported reference values', () => {
    expect(altitudeNote).toMatch(/reconstructed.*not telemetry/i)
    expect(sample(0).altitudeM).toBeCloseTo(0)
    expect(sample(141).altitudeM).toBeCloseTo(65000)
    expect(sample(1590).altitudeM).toBeCloseTo(275000)
    expect(sample(duration).altitudeM).toBeCloseTo(flight.model.ship.catch_altitude_m.value)
    expect(sample(100).altitudeM).toBeGreaterThan(0)
    expect(sample(100).altitudeM).toBeLessThan(65000)
  })

  it.each([
    [0, 33, 0],
    [141, 3, 6],
    [146, 32, 6],
    [182, 0, 6],
    [370, 13, 6],
    [395, 0, 6],
    [489, 0, 0],
    [1570, 0, 1],
    [1590, 0, 0],
    [77757, 0, 1],
    [77767, 0, 0],
    [81136, 0, 3],
    [81146, 0, 2],
    [81153, 0, 1],
    [81154, 0, 0],
  ])('at T+%is, reports %i booster engines and %i Ship engines', (t, boosterEngines, shipEngines) => {
    expect(sample(t)).toMatchObject({ boosterEngines, shipEngines })
  })
})

describe('Flight 15: reconstructed telemetry and deployment', () => {
  it('respects ECI/ECEF frames, unknown masses, and final vehicle states', () => {
    const launch = sample(0)
    expect(launch.earthAngleRad).toBe(0)
    expect(launch.ship.latitudeDeg).toBeCloseTo(flight.site.latitude_deg.value, 10)
    expect(launch.ship.longitudeDeg).toBeCloseTo(flight.site.longitude_deg.value, 10)
    expect(launch.ship.surfaceSpeedMs).toBeCloseTo(0)
    expect(launch.ship.inertialSpeedMs).toBeGreaterThan(0)
    expect(launch.booster.accelerationG).toBeGreaterThan(1)
    expect(sample(100).booster.propellantKg!).toBeLessThan(launch.booster.propellantKg!)
    expect(sample(200).booster.propellantKg).toBeNull()
    expect(sample(395).booster).toMatchObject({ status: 'fts', surfaceSpeedMs: expect.closeTo(0) })
    expect(sample(395).booster.downrangeM).toBeGreaterThan(1_000)
    expect(sample(duration).ship).toMatchObject({ status: 'caught', surfaceSpeedMs: expect.closeTo(0) })
    expect(sample(duration).ship.downrangeM).toBeLessThan(1e-6)
  })

  it('draws the ellipse from r/v and shows only the exterior arc if perigee is below the surface', () => {
    const inserted = sample(1590)
    const aligned = orbitPath(inserted.ship.r, inserted.ship.v)
    expect(aligned.points.length).toBeGreaterThan(100)
    expect(norm(sub(aligned.points[0], aligned.points.at(-1)!))).toBeLessThan(1e-6)
    expect(norm(aligned.perigee!) - earthRadiusM).toBeCloseTo(inserted.orbit.perigeeM!, 5)
    expect(norm(aligned.apogee!) - earthRadiusM).toBeCloseTo(inserted.orbit.apogeeM!, 5)
    const pre = sample(1570)
    const clipped = orbitPath(pre.ship.r, pre.ship.v)
    expect(norm(clipped.perigee!)).toBeLessThan(earthRadiusM)
    expect(clipped.points.every(p => norm(p) >= earthRadiusM - 1e-6)).toBe(true)
    expect(norm(sub(clipped.points[0], clipped.points.at(-1)!))).toBeGreaterThan(1)
    expect(sample(1580).orbit.perigeeM!).toBeGreaterThan(pre.orbit.perigeeM!)
    expect(sample(77762).orbit.perigeeM!).toBeLessThan(sample(77757).orbit.perigeeM!)
    expect(sample(77767).orbit.perigeeM!).toBeLessThan(sample(77762).orbit.perigeeM!)
    expect(burnDeltaV('insertion_start')).toBe(flight.mission.orbit.insertion_delta_v_m_s.value)
    expect(burnDeltaV('deorbit_start')).toBe(flight.model.ship.deorbit_delta_v_ms.value)
    expect(burnDeltaV('boostback_start')).toBeNull()
    expect(burnDeltaV('unknown')).toBeNull()
  })

  it('deploys 26 satellites with independent states in the deployment window and does not deorbit them with the Ship', () => {
    expect(sample(2100.999).satellites).toEqual([])
    const start = sample(2101)
    expect(start.satellites.map(s => s.id)).toEqual([1])
    expect(norm(sub(start.satellites[0].r, start.ship.r))).toBeLessThan(1e-6)
    expect(sample(4660 - 0.001).satellites).toHaveLength(25)
    const deployed = sample(4660).satellites
    expect(deployed.map(s => s.id)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1))
    const final = sample(duration).satellites
    expect(final).toHaveLength(26)
    expect(final.every(s => norm(s.r) > earthRadiusM + 260_000)).toBe(true)
    expect(new Set(final.map(s => s.r.join(','))).size).toBe(26)
    expect(final[0].r).not.toEqual(deployed[0].r)
    expect(sample(4660).satellites).toEqual(deployed)
  })
})
