import { describe, expect, it } from 'vitest'
import { flight } from './flight'

function metadataAt(node: unknown, path: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => metadataAt(item, `${path}[${index}]`))
  } else if (node !== null && typeof node === 'object') {
    const fields = node as Record<string, unknown>
    if ('value' in fields) {
      if (fields.confidence === 'unknown') {
        expect(fields.value, path).toBeNull()
        expect(fields.source, path).toBe('no publicado')
      } else {
        expect(['official', 'reported', 'estimate'], path).toContain(fields.confidence)
        expect(fields.source, path).toMatch(fields.confidence === 'estimate'
          ? /^(https?:\/\/|docs\/[A-Za-z0-9_-]+\.md(?:#|$))/
          : /^https?:\/\//)
        expect(fields.value, path).not.toBeNull()
      }
      if (typeof fields.value === 'number' || Array.isArray(fields.value)) {
        expect(fields.unit, path).toMatch(/\S/)
      }
    } else {
      for (const [key, value] of Object.entries(fields)) {
        if (key === 't_sec') {
          expect(fields.t_unit, path).toBe('s')
          expect(fields.source, path).toMatch(/^https?:\/\//)
          expect(Number.isSafeInteger(value), path).toBe(true)
        } else {
          metadataAt(value, `${path}.${key}`)
        }
      }
    }
  } else {
    expect(typeof node, path).not.toBe('number')
  }
}

describe('Flight 15: datos locales', () => {
  it('carga metadatos y conserva la confianza de los datos', () => {
    expect(flight.meta.disclaimer).toMatch(/no es información oficial/i)
    expect(flight.meta.timeline_note).toMatch(/aproximados/i)
    expect(flight.mission.orbit.altitude_km).toMatchObject({
      value: 275, confidence: 'reported', unit: 'km',
    })
    expect(flight.vehicle.booster.dry_mass_kg).toMatchObject({
      value: null, confidence: 'unknown', source: 'no publicado', unit: 'kg',
    })
    expect(flight.timeline.find(event => event.id === 'max_q')?.altitude_m).toMatchObject({
      value: null, confidence: 'unknown', source: 'no publicado', unit: 'm',
    })
    metadataAt(flight, 'flight')
  })

  it('tiene todos los hitos públicos, ordenados, y alinea FTS con el corte', () => {
    expect(flight.timeline.map(event => [event.id, event.t_sec])).toEqual([
      ['liftoff', 0],
      ['max_q', 58],
      ['meco', 139],
      ['hot_staging', 141],
      ['boostback_start', 146],
      ['boostback_shutdown', 182],
      ['booster_landing_burn_start', 370],
      ['booster_landing_burn_shutdown', 395],
      ['booster_fts', 395],
      ['ship_ascent_cutoff', 489],
      ['insertion_start', 1570],
      ['insertion_shutdown', 1590],
      ['payload_deploy_start', 2101],
      ['payload_deploy_complete', 4660],
      ['hawaii_check_early', 5266],
      ['chile_check', 26135],
      ['hawaii_check_final', 74515],
      ['deorbit_start', 77757],
      ['deorbit_shutdown', 77767],
      ['entry', 79846],
      ['transonic', 80974],
      ['subsonic', 81013],
      ['ship_landing_burn_start', 81136],
      ['landing_flip', 81138],
      ['landing_3_to_2', 81146],
      ['landing_2_to_1', 81153],
      ['ship_catch', 81154],
    ])
    const shutdown = flight.timeline.find(event => event.id === 'booster_landing_burn_shutdown')
    expect(shutdown?.label).not.toMatch(/catch/i)
    expect(shutdown?.as_flown_note).toMatch(/No hubo catch/)
    expect(flight.timeline.at(-1)?.as_flown_note).toMatch(/Catch en Pad 2/)
  })
})
