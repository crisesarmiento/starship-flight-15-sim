import data from '../../data/flight15.json'
import { norm, osculating, referenceAltitude, type Metrics } from './metrics'
import { type TimelineRow } from './timeline'

const format = (value: number | null | undefined, digits = 3) =>
  value != null && Number.isFinite(value) ? value.toFixed(digits) : '—'
const signed = (value: number) => !Number.isFinite(value)
  ? '—' : `${value < -0.0005 ? '-' : '+'}${format(Math.abs(value))}`
const asKm = (meters: number | null | undefined) => meters == null ? null : meters / 1000
const elapsed = (seconds: number) =>
  [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':')

function evidenceText(source: NonNullable<TimelineRow['clock']>, row: TimelineRow) {
  const { label, transitions } = source
  if (transitions.length === 0) return `${label}: no observado`
  if (transitions.length > 1) return `${label}: ambiguo (${transitions.map(x => format(x.time)).join(', ')} s)`
  const { time, before, after } = transitions[0]
  const error = time - row.time
  return `${label}: ${format(time)} s (${signed(error)} s${Math.abs(error) > row.tolerance ? ', fuera' : ''})` +
    (source === row.clock ? '' : ` ${before === null ? 'inicio:' : `${before} →`} ${after}`)
}

function comparison(label: string, got: number | null, target: number, tolerance: number, unit: string) {
  const error = got == null ? null : got - target
  const result = error == null || !Number.isFinite(error) ? 'No evaluable' : Math.abs(error) <= tolerance ? 'Dentro' : 'Fuera'
  return `| ${label} | ${target} ${unit} | ${format(got)} | ${error == null ? '—' : signed(error)} | ±${tolerance} ${unit} | ${result} |`
}

type Datum = { confidence: string; value: unknown; unit?: string; source: string; note?: string }
function* datums(node: unknown, path = ''): Generator<[string, Datum]> {
  if (node == null || typeof node !== 'object') return
  if ('confidence' in node && 'value' in node) {
    yield [path, node as Datum]
    return
  }
  for (const [key, value] of Object.entries(node)) {
    const name = Array.isArray(node) && value?.id ? value.id : key
    yield* datums(value, path ? `${path}.${name}` : name)
  }
}
const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ')
const sourceLink = (source: string) => source.replace(/^docs\//, '')

export function renderReport(rows: TimelineRow[], metrics: Metrics) {
  const { staging, stagingRawM, insertionBefore, insertionAfter, deorbitBefore, deorbitAfter, entry, hover, caught } = metrics
  const cut = metrics.entryCut
  const dataRows = [...datums(data)]
  const estimates = dataRows.filter(([, datum]) => datum.confidence === 'estimate')
  const unknowns = dataRows.filter(([, datum]) => datum.confidence === 'unknown')
  const perigee = (state: typeof insertionAfter) => format(asKm(state?.orbit.perigeeM))
  const actual = (state: typeof staging) => format(asKm(state?.ship.altitudeM))
  return [
    '# Validación — Starship Flight 15',
    '',
    '<!-- Generado por src/validation. No editar a mano. -->',
    '',
    'Aproximación educativa con datos públicos. No es telemetría ni una validación operativa.',
    '',
    'Para regenerar: `UPDATE_REPORT=1 npm test -- src/validation`. Sin `UPDATE_REPORT=1`, el test no escribe el archivo.',
    '',
    '## Línea de tiempo',
    '',
    'Referencia independiente: [SPEC §2 y §8](SPEC.md) y [copia de la tabla pública en research §3](research.md#3-línea-de-tiempo-oficial-copia-de-trabajo).',
    'Son 26 hitos públicos aproximados y una fila adicional de FTS: el relato ubica el FTS al corte, sin publicar un segundo independiente.',
    'El reloj es impuesto; encendidos, cortes, despliegue y estados finales también están guiados por el programa. Medir cuándo cambia su salida comprueba la implementación, no una predicción física de esos horarios.',
    'Max Q, chequeos, entrada, transónico, subsónico y flip se contrastan como marcadores de fase: no son detecciones físicas de presión dinámica, Mach ni actitud.',
    'Se muestrea alrededor de cada referencia cada 0,25 s (±tolerancia más 2 s) y se refina cada transición detectada por bisección; a T+0 se observa el estado inicial.',
    'Los residuales son **observado − referencia**. Un marcador sin transición o ambiguo no cuenta como aprobado.',
    '',
    '| Hito | T+ público (s) | Tolerancia | Reloj impuesto: marcador medido (Δs) | Efectos observados en `sample` (Δs) |',
    '| --- | ---: | ---: | --- | --- |',
    ...rows.map(row => `| \`${row.id}\` | ${elapsed(row.time)} (${row.time}) | ±${row.tolerance} s | ` +
      `${row.clock ? evidenceText(row.clock, row) : 'Compartido con FTS'} | ` +
      `${row.effects.map(effect => evidenceText(effect, row)).join('; ') || 'Solo marcador'} |`),
    '',
    '## Trayectoria: predicción bruta, guía y órbita',
    '',
    'Para el arrastre se usan densidades tabuladas de la U.S. Standard Atmosphere 1976 (Tabla II), con interpolación logarítmica hasta 86 km. Por encima, se extrapola la última pendiente: no es la atmósfera superior del modelo estándar.',
    '',
    'El error bruto se evalúa antes del ajuste radial. La altitud ajustada se toma en el encendido de la Ship observado; la altitud y el perigeo orbitales, justo después del corte de inserción observado.',
    '',
    '| Magnitud | Referencia | Simulado | Residual | Tolerancia | Resultado |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    comparison('Staging bruto, antes de guía', asKm(stagingRawM), referenceAltitude.staging / 1000, 10, 'km'),
    comparison(`Staging ajustado (${staging?.ship.method ?? 'sin muestra'})`, asKm(staging?.ship.altitudeM), referenceAltitude.staging / 1000, 10, 'km'),
    comparison(`Altitud post-inserción (${insertionAfter?.ship.method ?? 'sin muestra'})`, asKm(insertionAfter?.ship.altitudeM), referenceAltitude.orbit / 1000, 15, 'km'),
    comparison('Perigeo post-inserción', asKm(insertionAfter?.orbit.perigeeM), referenceAltitude.orbit / 1000, 15, 'km'),
    '',
    `Perigeo osculante durante inserción: **${perigee(insertionBefore)} → ${perigee(insertionAfter)} km**; durante desórbita: **${perigee(deorbitBefore)} → ${perigee(deorbitAfter)} km**. Altitud en el marcador de entrada: ${actual(entry)} km.`,
    `Perigeo reportado por McDowell: ~${data.mission.orbit.mcdowell_perigee_km.value} km (vía Wikipedia, ver [research §2](research.md#ship-como-voló)); no es una referencia oficial adicional.`,
    ...(insertionAfter ? [
      `Después de la inserción, el estado ECI da perigeo ${format(asKm(osculating(insertionAfter.ship).perigeeM))} km al recalcular con μ WGS 84. El simulador informa apogeo ${format(asKm(insertionAfter.orbit.apogeeM))} km, inclinación ${format(insertionAfter.orbit.inclinationDeg)}°, período ${format(insertionAfter.orbit.periodS)} s y excentricidad ${format(insertionAfter.orbit.eccentricity, 6)} (sin referencia de vuelo validada).`,
    ] : []),
    '',
    '## Corte cinematográfico en la entrada',
    '',
    `En T+${format(cut.time)} s el modelo pasa de la costa kepleriana a un tramo cinematográfico local. El salto se calcula entre los dos estados ECI del simulador en ese mismo instante:`,
    '',
    `- Desplazamiento \`‖r después − r antes‖\`: **${format(asKm(cut.measuredDistanceM))} km**.`,
    `- Diferencia vectorial de velocidad \`‖v después − v antes‖\`: **${format(cut.measuredVelocityGapMs)} m/s** (rapideces inerciales: ${format(norm(cut.before.v))} → ${format(norm(cut.after.v))} m/s).`,
    '',
    'Es una discontinuidad deliberada del modelo, no un residual contra telemetría ni el Δv de una quema. No hay un límite publicado para comparar esos saltos: el test verifica el instante y los estados, no exige continuidad física. El tramo posterior no permite inferir el corredor real, las cargas en la transición ni las solicitaciones aerotérmicas.',
    '',
    '## Desenlace observado',
    '',
    `- Booster justo antes del FTS: altitud ${format(hover?.booster.altitudeM)} m, velocidad relativa al suelo ${format(hover?.booster.surfaceSpeedMs)} m/s, distancia a Pad 2 ${format(asKm(metrics.hoverSite?.padDistanceM))} km, ` +
      `${metrics.hoverSite ? (metrics.hoverSite.eastOfPad ? 'al este del pad' : 'no al este del pad') : 'rumbo no evaluable'}. El desplazamiento al este, la altitud baja y la poca velocidad son comprobaciones cualitativas del desvío y hover, no coordenadas reales ni una prueba cartográfica de la costa.`,
    `- Booster al FTS: estado \`${metrics.fts?.booster.status ?? 'no observado'}\`, motores ${metrics.fts?.boosterEngines ?? '—'}. No se usa el rótulo de catch incorrecto de la tabla pública.`,
    `- Ship en la catch: estado \`${caught?.ship.status ?? 'no observado'}\`, motores ${caught?.shipEngines ?? '—'}, distancia horizontal al Pad 2 ${format(metrics.catchSite?.padDistanceM)} m (ECI convertido a Tierra fija). La altura real de los brazos no está publicada.`,
    '',
    '## Δv de las maniobras',
    '',
    'Estimaciones y entradas del modelo, no telemetría. El Δv reportado de inserción se usa como entrada, por lo que el residual no es una validación independiente. Sin tolerancia numérica publicada; un `null` significa que el modelo no informa un Δv para esa maniobra.',
    '',
    '| Maniobra | Δv modelo (m/s) | Referencia (m/s) | Residual (m/s) |',
    '| --- | ---: | --- | ---: |',
    ...metrics.burns.map(({ id, deltaV }) => {
      const target = data.mission.orbit.insertion_delta_v_m_s.value
      const reported = id === 'insertion_start'
      return `| \`${id}\` | ${deltaV === null ? 'No evaluable: el modelo no informa Δv' : format(deltaV)} | ${reported ? `~${target} (McDowell, reportado)` : 'No evaluable: sin referencia publicada'} | ` +
        `${reported && deltaV != null ? signed(deltaV - target) : '—'} |`
    }),
    '',
    '## Estimaciones declaradas en `data/flight15.json`',
    '',
    '| Parámetro | Valor | Confianza | Fuente / nota |',
    '| --- | --- | --- | --- |',
    ...estimates.map(([path, datum]) => `| \`${path}\` | ${cell(String(datum.value))} ${datum.unit ?? ''} | estimate | ` +
      `[Fuente](${sourceLink(datum.source)})${datum.note ? `: ${cell(datum.note)}` : ''} |`),
    ...(estimates.length ? [] : ['| — | — | — | No hay entradas marcadas como `estimate`. |']),
    '',
    '## Datos desconocidos: no evaluables',
    '',
    'Un valor simulado para una magnitud sin referencia publicada no rellena el `null` ni se considera oficial. Ver también los huecos no tabulados en [research §5](research.md#5-qué-no-apareció-huecos-que-importan-al-sim).',
    'Chequeo de UI (manual, no cubierto por este test): en el HUD, ninguna magnitud `unknown` debe llevar la etiqueta «Oficial»; si se muestra un valor del modelo, tiene que indicar su procedencia estimada, interpolada o calculada.',
    '',
    '| Campo en el JSON | Estado | Nota |',
    '| --- | --- | --- |',
    ...unknowns.map(([path, datum]) => `| \`${path}\` | \`unknown\` / no evaluable | ${cell(datum.note ?? datum.source)} |`),
    '',
  ].join('\n')
}
