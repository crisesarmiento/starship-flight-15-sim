import { beforeAll, describe, expect, it } from 'vitest'
import data from '../../data/flight15.json'
import { earthRadiusM, sample } from '../core'
import { distance, norm, observeMetrics, osculating, referenceAltitude } from './metrics'
import { maybeWriteReport } from './report-output.mjs'
import { renderReport } from './report'
import { observeTimeline, observedTime, references, type TimelineRow } from './timeline'

let rows: TimelineRow[]
let metrics: ReturnType<typeof observeMetrics>

beforeAll(() => {
  rows = observeTimeline()
  metrics = observeMetrics(rows)
  maybeWriteReport(renderReport(rows, metrics))
})

function timeOf(id: string): number {
  const time = observedTime(rows.find(row => row.id === id))
  if (time === null) throw new Error(`No hay una observación única de ${id}`)
  return time
}

function required<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`Sin muestra de ${label}`)
  return value
}

function within(label: string, actual: number | null, expected: number, tolerance: number) {
  const value = required(actual, label)
  expect(Number.isFinite(value), label).toBe(true)
  expect(Math.abs(value - expected), label).toBeLessThanOrEqual(tolerance)
}

describe('Línea de tiempo pública, no derivada de los datos del simulador', () => {
  it('el JSON tiene los 26 hitos públicos y el FTS, en el orden y T+ de la copia pública', () => {
    expect(references).toHaveLength(27)
    expect(data.timeline.map(event => [event.id, event.t_sec]))
      .toEqual(references.map(ref => [ref.id, ref.time]))
  })

  it.each(references)('$id: el hito y sus efectos observables caen dentro de ±$tolerance s', ({ id }) => {
    const row = rows.find(candidate => candidate.id === id)!
    const allEvidence = [...(row.clock ? [row.clock] : []), ...row.effects]
    for (const { label, transitions } of allEvidence) {
      expect(transitions, `${id} · ${label}: se esperaba una única transición en la ventana`).toHaveLength(1)
      within(`${id} · ${label} (s)`, transitions[0].time, row.time, row.tolerance)
    }
  })

  it('el estado inicial de despegue va seguido de ascenso', () => {
    const initial = sample(timeOf('liftoff'))
    const ascending = sample(initial.time + 2)
    expect(initial.shipEngines).toBe(0)
    expect(ascending.booster.altitudeM).toBeGreaterThan(initial.booster.altitudeM)
  })
})

describe('Trayectoria guiada y elementos orbitales', () => {
  it('registra el residual bruto y mide la altitud de staging ajustada', () => {
    expect(Number.isFinite(metrics.stagingRawM)).toBe(true)
    const staging = required(metrics.staging, 'staging')
    within('Altitud Ship en staging (m)', staging.ship.altitudeM, referenceAltitude.staging, 10_000)
    within('Altitud derivada del vector de staging (m)', norm(staging.ship.r) - earthRadiusM, staging.ship.altitudeM, 1)
  })

  it('sube el perigeo con la inserción y alcanza ~275 km en el estado posterior', () => {
    const before = required(metrics.insertionBefore, 'pre-inserción')
    const after = required(metrics.insertionAfter, 'post-inserción')
    const beforeOrbit = osculating(before.ship)
    const afterOrbit = osculating(after.ship)
    expect(beforeOrbit.perigeeM, 'Perigeo suborbital antes de inserción').toBeLessThan(120_000)
    expect(afterOrbit.energy, 'Aumenta la energía orbital').toBeGreaterThan(beforeOrbit.energy)
    within('Altitud post-inserción (m)', after.ship.altitudeM, referenceAltitude.orbit, 15_000)
    within('Altitud derivada del estado post-inserción (m)', afterOrbit.radius - earthRadiusM, after.ship.altitudeM, 1)
    within('Perigeo post-inserción (m)', after.orbit.perigeeM, referenceAltitude.orbit, 15_000)
    within('Perigeo calculado desde r y v (m)', after.orbit.perigeeM, afterOrbit.perigeeM, 1)
    within('Apogeo calculado desde r y v (m)', after.orbit.apogeeM, afterOrbit.apogeeM, 1)
    within('Inclinación calculada desde r y v (°)', after.orbit.inclinationDeg, afterOrbit.inclinationDeg, 0.001)
    within('Período calculado desde r y v (s)', after.orbit.periodS, afterOrbit.periodS, 0.01)
    within('Excentricidad calculada desde r y v', after.orbit.eccentricity, afterOrbit.eccentricity, 0.00001)
  })

  it('la desórbita baja el perigeo dentro de la atmósfera', () => {
    const before = osculating(required(metrics.deorbitBefore, 'pre-desórbita').ship)
    const after = required(metrics.deorbitAfter, 'post-desórbita')
    const afterOrbit = osculating(after.ship)
    expect(afterOrbit.energy, 'Disminuye la energía orbital').toBeLessThan(before.energy)
    expect(afterOrbit.perigeeM).toBeLessThan(before.perigeeM)
    expect(afterOrbit.perigeeM, 'Perigeo bajo la interfaz de entrada de la simulación')
      .toBeLessThan(required(metrics.entry, 'entrada').ship.altitudeM)
    within('Perigeo calculado desde r y v (m)', after.orbit.perigeeM, afterOrbit.perigeeM, 1)
  })

  it('el corte cinematográfico de entrada se declara y coincide con los dos estados ECI observados', () => {
    const cut = metrics.entryCut
    within('T+ del corte frente al marcador de entrada observado (s)', cut.time, timeOf('entry'), 0.000001)
    within('Salto de posición ECI (m)', cut.distanceM, cut.measuredDistanceM, 0.001)
    within('Salto vectorial de velocidad ECI (m/s)', cut.velocityGapMs, cut.measuredVelocityGapMs, 0.001)

    const previous = sample(cut.time - 0.0001).ship
    const following = sample(cut.time).ship
    // The first sample is 0.1 ms before the cut, so its position may
    // differ by ~0.8 m at orbital speed. These are consistency bounds,
    // not limits on the size of either discontinuity.
    within('Posición previa frente a sample (m)', distance(cut.before.r, previous.r), 0, 2)
    within('Velocidad previa frente a sample (m/s)', distance(cut.before.v, previous.v), 0, 0.01)
    within('Posición posterior frente a sample (m)', distance(cut.after.r, following.r), 0, 0.001)
    within('Velocidad posterior frente a sample (m/s)', distance(cut.after.v, following.v), 0, 0.001)
  })

  it('si el modelo informa un Δv de quema, es positivo y finito', () => {
    for (const { id, deltaV } of metrics.burns) {
      if (deltaV === null) continue
      expect(Number.isFinite(deltaV), id).toBe(true)
      expect(deltaV, id).toBeGreaterThan(0)
    }
  })
})

describe('Despliegue y desenlace', () => {
  it('cada Starlink se separa una sola vez, dentro de la ventana, y continúa con un estado propio', () => {
    const start = timeOf('payload_deploy_start')
    const end = timeOf('payload_deploy_complete')
    const ids = new Set<number>()
    expect(sample(start - 0.01).satellites).toHaveLength(0)
    for (let t = start; t <= end; t = Math.min(t + 1, end)) {
      const current = sample(t).satellites
      const currentIds = new Set(current.map(satellite => satellite.id))
      expect(currentIds.size, `T+${t}: IDs duplicados`).toBe(current.length)
      expect([...ids].every(id => currentIds.has(id)), `T+${t}: desapareció un Starlink`).toBe(true)
      expect(current.length - ids.size, `T+${t}: se esperan separaciones individuales`).toBeLessThanOrEqual(1)
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
      expect(norm(satellite.r), `Starlink ${satellite.id} está sobre la Tierra`).toBeGreaterThan(earthRadiusM)
      expect(norm(satellite.v), `Starlink ${satellite.id} se mueve`).toBeGreaterThan(0)
      expect(distance(satellite.r, later.ship.r), `Starlink ${satellite.id} separado de la Ship`).toBeGreaterThan(0)
      const following = required(next.satellites.find(other => other.id === satellite.id) ?? null, `Starlink ${satellite.id}`)
      expect(distance(satellite.r, following.r), `Starlink ${satellite.id} avanza`).toBeGreaterThan(0)
      for (const other of later.satellites.slice(0, i)) {
        expect(distance(satellite.r, other.r), `Starlinks ${satellite.id} y ${other.id} no coinciden`).toBeGreaterThan(0)
      }
    }
    expect(new Set(later.satellites.map(satellite => satellite.id))).toEqual(ids)
  })

  it('el booster se aleja hacia el Golfo, termina bajo y lento, y queda en FTS sin catch', () => {
    const hover = required(metrics.hover, 'pre-FTS')
    const fts = required(metrics.fts, 'FTS')
    const site = required(metrics.hoverSite, 'sitio de FTS')
    expect(site.eastOfPad).toBe(true)
    // Classify as away from the pad; no distance or coordinates are fitted to the actual FTS.
    expect(site.padDistanceM).toBeGreaterThan(100)
    expect(hover.booster.altitudeM).toBeGreaterThan(0)
    expect(hover.booster.altitudeM).toBeLessThan(150)
    expect(hover.booster.surfaceSpeedMs).toBeGreaterThanOrEqual(0)
    expect(hover.booster.surfaceSpeedMs, 'Velocidad baja justo antes del corte (m/s)').toBeLessThan(25)
    expect(hover.boosterEngines).toBeGreaterThan(0)
    expect(fts.boosterEngines).toBe(0)
    expect(fts.booster.status).toBe('fts')
    const start = timeOf('liftoff')
    for (let t = start; t < fts.time; t++) expect(sample(t).booster.status).not.toBe('caught')
    expect(sample(timeOf('ship_catch')).booster.status).toBe('fts')
  })

  it('la Ship corta los motores y queda atrapada en Pad 2', () => {
    const caught = required(metrics.caught, 'catch Ship')
    const site = required(metrics.catchSite, 'sitio de catch')
    expect(caught.ship.status).toBe('caught')
    expect(caught.shipEngines).toBe(0)
    // Pedagogical location check, not an as-flown precision claim.
    expect(site.padDistanceM).toBeLessThan(100)
  })
})
