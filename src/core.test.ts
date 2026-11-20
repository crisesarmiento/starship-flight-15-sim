import { describe, expect, it } from 'vitest'
import { altitudeNote, duration, eventAt, flight, sample } from './core'

describe('Flight 15: seek de la misión', () => {
  it('resuelve cada hito en el instante exacto; el FTS gana el empate con el corte', () => {
    for (const event of flight.timeline) {
      const expectedId = event.id === 'booster_landing_burn_shutdown' ? 'booster_fts' : event.id
      expect(eventAt(event.t_sec).id).toBe(expectedId)
      expect(sample(event.t_sec).event.id).toBe(expectedId)
    }
    expect(eventAt(394.999).id).toBe('booster_landing_burn_start')
    expect(eventAt(395).id).toBe('booster_fts')
    expect(eventAt(395.001).id).toBe('booster_fts')
  })

  it('hace seek determinista hacia adelante y atrás, incluso fuera del recorrido', () => {
    expect(duration).toBe(81154)
    const descent = sample(81153.5)
    expect(descent).toMatchObject({ time: 81153.5, shipEngines: 1, event: { id: 'landing_2_to_1' } })
    expect(sample(58.5)).toMatchObject({ time: 58.5, event: { id: 'max_q' } })
    expect(sample(81153.5)).toEqual(descent)
    for (const t of [-Infinity, -1, NaN]) expect(sample(t)).toEqual(sample(0))
    for (const t of [duration + 1, Infinity]) expect(sample(t)).toEqual(sample(duration))
  })

  it('expone la altitud como esquemática y conserva las referencias reportadas', () => {
    expect(altitudeNote).toMatch(/esquemática.*no telemetría/i)
    expect(sample(0).altitudeM).toBe(0)
    expect(sample(141).altitudeM).toBe(65000)
    expect(sample(1590).altitudeM).toBe(275000)
    expect(sample(77767).altitudeM).toBe(275000)
    expect(sample(duration).altitudeM).toBe(0)
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
  ])('en T+%is da %i motores del booster y %i de la Ship', (t, boosterEngines, shipEngines) => {
    expect(sample(t)).toMatchObject({ boosterEngines, shipEngines })
  })
})
