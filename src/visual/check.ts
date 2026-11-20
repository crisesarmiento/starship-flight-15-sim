import * as THREE from 'three'
import { CAMERA_MODES, worldQuaternionFor } from './cameraRig'
import { calloutsAt } from './callouts'
import { duration, earthRadiusM, entryHandoff, eventTime, flight, frameAt, orbitPath } from './core'
import { VISUAL, boosterEngineLayout, measuredFrom, shipEngineLayout } from './dimensions'
import { EVENT_LABELS, MODE_LABELS } from './labels'
import { attitudeQuaternion, ecefToEci, eciToEcef, enuAt, geodeticToScene, noseDirection, SUN_DIRECTION, toScene, type AttitudeTimes } from './frames'
import { buildManeuvers, dvBadge, dvValueText } from './maneuvers'
import { Overlays } from './overlays'
import { engineBadge, stateBadge, statusEs, telemetryRows } from './telemetry'
import { buildTimeScale } from './timeScale'
import { buildBooster, buildShip } from './vehicles'

export interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol
const nn = (x: number | null): number => x ?? Number.NaN
const finite3 = (v: readonly number[]) => v.length === 3 && v.every(Number.isFinite)

function bodyBox(parts: THREE.Mesh[], group: THREE.Group): THREE.Box3 {
  group.updateMatrixWorld(true)
  const box = new THREE.Box3()
  for (const p of parts) box.union(new THREE.Box3().setFromObject(p))
  return box
}

function minGap(pts: { x: number; z: number; r: number }[]): number {
  let worst = Infinity
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) worst = Math.min(worst, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) - pts[i].r - pts[j].r)
  return worst
}

/** Focused checks: static scene cotas (stage 2), core contract and frames, orbit/HUD honesty (stage 7.5). */
export function runVisualChecks(): CheckResult[] {
  const out: CheckResult[] = []
  const add = (name: string, ok: boolean, detail: string) => out.push({ name, ok, detail })
  const m = measuredFrom(flight)
  const T = {
    ftsT: eventTime('booster_fts'),
    catchT: eventTime('ship_catch'),
    meco: eventTime('meco'),
    boostbackStart: eventTime('boostback_start'),
    insStart: eventTime('insertion_start'),
    insEnd: eventTime('insertion_shutdown'),
    deploy0: eventTime('payload_deploy_start'),
    deploy1: eventTime('payload_deploy_complete'),
    deorbitStart: eventTime('deorbit_start'),
  }

  // ---- stage 2: measured dimensions of the built models
  const booster = buildBooster(m)
  const ship = buildShip(m)
  const bs = bodyBox(booster.bodies, booster.group).getSize(new THREE.Vector3())
  const ss = bodyBox(ship.bodies, ship.group).getSize(new THREE.Vector3())
  add('booster 72 m de alto', near(bs.y, 72, 1e-3), `${bs.y.toFixed(3)} m`)
  add('ship 52 m de alto', near(ss.y, 52, 1e-3), `${ss.y.toFixed(3)} m`)
  add('stack = 124 m', near(bs.y + ss.y, 124, 1e-3), `${(bs.y + ss.y).toFixed(3)} m`)
  add('diámetro 9 m en booster y ship', near(bs.x, 9, 0.05) && near(ss.x, 9, 0.05) && near(bs.z, 9, 0.05) && near(ss.z, 9, 0.05), `${bs.x.toFixed(3)} / ${ss.x.toFixed(3)} m`)
  add('booster con 33 motores (13 centrales + 20 perimetrales)', booster.engines.length === 33 && boosterEngineLayout(m).filter((e) => e.ring !== 'outer').length === 13, `${booster.engines.length}`)
  add('ship con 6 motores (3 nivel del mar + 3 vacío)', ship.engines.length === 6 && shipEngineLayout(m).filter((e) => e.kind === 'sl').length === 3, `${ship.engines.length}`)
  add('booster con 3 grid fins (no 4)', booster.gridFins.length === 3, `${booster.gridFins.length}`)
  const bl = boosterEngineLayout(m).map((e) => ({ x: e.x, z: e.z, r: VISUAL.bellRadius }))
  const sl = shipEngineLayout(m).map((e) => ({ x: e.x, z: e.z, r: e.kind === 'vac' ? VISUAL.vacBellRadius : VISUAL.bellRadius }))
  add('motores sin superponerse y dentro del casco', minGap(bl) >= -1e-9 && minGap(sl) >= -1e-9 && [...bl, ...sl].every((p) => Math.hypot(p.x, p.z) + p.r <= m.diameter / 2), `${minGap(bl).toFixed(3)} / ${minGap(sl).toFixed(3)} m`)
  booster.setEngines(32)
  ship.setEngines(3)
  add('plumas siguen el recuento (32 y 3)', booster.plumes.filter((p) => p.visible).length === 32 && ship.plumes.filter((p) => p.visible).length === 3, 'ok')

  // ---- frames
  const probe = toScene([1, 2, 3])
  add('ejes: ECI z (norte) es arriba y la conversión es una rotación', probe.x === 1 && probe.y === 3 && probe.z === -2, `${probe.toArray()}`)
  const lat = m.padLat
  const lon = m.padLon
  const enu = enuAt(lat, lon)
  const padEcef = geodeticToScene(lat, lon, earthRadiusM)
  add('Pad en coordenadas: la vertical local coincide con la posición del pad', enu.up.angleTo(padEcef.clone().normalize()) < 1e-9 && near(enu.east.dot(enu.up), 0, 1e-12) && near(enu.east.clone().cross(enu.up).dot(enu.south), 1, 1e-9), `lat ${lat} lon ${lon}`)
  const there = ecefToEci(padEcef, 0.7)
  add('Tierra: ecef→eci→ecef es la identidad', eciToEcef(there, 0.7).distanceTo(padEcef) < 1e-6, 'ok')
  const sunElev = THREE.MathUtils.radToDeg(Math.asin(SUN_DIRECTION.dot(enu.up)))
  add('luz solar al despegue: sol de tarde sobre el horizonte del pad', sunElev > 3 && sunElev < 35, `${sunElev.toFixed(1)}°`)
  const qs = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0.3), new THREE.Vector3(-0.4, 0.2, 0.9), new THREE.Vector3(0.1, -0.7, 0.2)]
  add('cámara: la vertical del foco queda en +Y', qs.every((u) => u.clone().normalize().applyQuaternion(worldQuaternionFor(u)).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9), 'ok')
  add('cinco o seis modos de cámara con texto en español', CAMERA_MODES.length === 6 && CAMERA_MODES.every((k) => MODE_LABELS[k].name.length > 0 && MODE_LABELS[k].key.length === 1), CAMERA_MODES.join(' '))

  // ---- core contract
  const grid = [0, 30, 141, 146, 300, T.ftsT - 1, T.ftsT, 489, T.insStart + 5, T.insEnd + 60, T.deploy0 + 600, T.deploy1 + 60, 20000, T.deorbitStart - 100, 79000, 80900, 81100, T.catchT]
  let shape = true
  for (const t of grid) {
    const s = frameAt(t)
    for (const v of [s.ship, s.booster]) {
      shape &&= finite3(v.r) && finite3(v.v) && Number.isFinite(v.altitudeM) && Number.isFinite(v.surfaceSpeedMs) && Number.isFinite(v.inertialSpeedMs) && Number.isFinite(v.downrangeM) && Number.isFinite(v.accelerationG) && Number.isFinite(v.latitudeDeg) && Number.isFinite(v.longitudeDeg) && typeof v.method === 'string' && typeof v.status === 'string'
      shape &&= v.propellantKg === null || Number.isFinite(v.propellantKg)
    }
    shape &&= Number.isFinite(s.earthAngleRad) && Number.isFinite(s.orbit.perigeeM) && Number.isFinite(s.orbit.apogeeM) && Number.isFinite(s.orbit.inclinationDeg) && Number.isFinite(s.orbit.periodS)
  }
  add('el núcleo entrega ship, booster y órbita con valores válidos en toda la misión', shape, `${grid.length} instantes`)
  let angleUp = true
  for (let i = 1; i < grid.length; i++) angleUp &&= frameAt(grid[i]).earthAngleRad >= frameAt(grid[i - 1]).earthAngleRad
  add('la Tierra rota (earthAngleRad crece)', angleUp, `${frameAt(0).earthAngleRad} → ${frameAt(duration).earthAngleRad}`)
  add('booster: estado fts desde el FTS y no antes', frameAt(T.ftsT - 1).booster.status !== 'fts' && frameAt(T.ftsT).booster.status === 'fts', `${frameAt(T.ftsT - 1).booster.status} → ${frameAt(T.ftsT).booster.status}`)
  add('ship: estado caught al terminar', frameAt(duration).ship.status === 'caught', frameAt(duration).ship.status)

  const atFts = frameAt(T.ftsT)
  const padAtFts = ecefToEci(padEcef, atFts.earthAngleRad)
  const bFts = toScene(atFts.booster.r)
  add('el booster no vuelve a la torre (FTS lejos del pad)', bFts.distanceTo(padAtFts) > 2000, `${(bFts.distanceTo(padAtFts) / 1000).toFixed(1)} km del pad`)
  const atCatch = frameAt(T.catchT)
  const padAtCatch = ecefToEci(padEcef, atCatch.earthAngleRad)
  add('la catch ocurre en la torre, no en el agua', toScene(atCatch.ship.r).distanceTo(padAtCatch) < 3000, `${toScene(atCatch.ship.r).distanceTo(padAtCatch).toFixed(0)} m del pad`)
  add('FTS: sin posición publicada en los datos', flight.mission.outcomes.booster.splashdown_coordinates.value === null, 'splashdown_coordinates = null')

  // satellites: 26, numbered, inside the deployment window
  const early = frameAt(T.deploy0 - 60).satellites.length
  const late = frameAt(T.deploy1 + 60).satellites
  const ids = new Set(late.map((x) => x.id))
  add('26 Starlink numerados al terminar el despliegue', late.length === flight.mission.payload.count.value && ids.size === late.length && late.every((x) => Number.isInteger(x.id) && x.id >= 1 && x.id <= 26 && finite3(x.r) && finite3(x.v)), `${late.length} satélites`)
  add('ningún Starlink se separa antes de la ventana de despliegue', early === 0, `${early} antes de T+${T.deploy0}`)

  // orbit: perigee/apogee points agree with the elements the core reports
  const orb = frameAt(T.deploy0 + 600)
  const path = orbitPath(orb.ship.r, orb.ship.v)
  const pr = path.perigee ? Math.hypot(...path.perigee) - earthRadiusM : NaN
  const ar = path.apogee ? Math.hypot(...path.apogee) - earthRadiusM : NaN
  add('órbita en vivo: el arco trae perigeo y apogeo', path.points.length >= 16 && path.perigee !== null && path.apogee !== null, `${path.points.length} puntos`)
  add('perigeo y apogeo dibujados coinciden con los valores del HUD (altitud sobre la superficie)', near(pr, nn(orb.orbit.perigeeM), 2000) && near(ar, nn(orb.orbit.apogeeM), 2000), `${(pr / 1000).toFixed(1)} / ${(ar / 1000).toFixed(1)} km vs ${(nn(orb.orbit.perigeeM) / 1000).toFixed(1)} / ${(nn(orb.orbit.apogeeM) / 1000).toFixed(1)} km`)
  add('tras la inserción el perigeo está en 275 km ± 15 km', Math.abs(nn(orb.orbit.perigeeM) / 1000 - 275) <= 15, `${(nn(orb.orbit.perigeeM) / 1000).toFixed(1)} km`)
  const before = nn(frameAt(T.insStart - 30).orbit.perigeeM)
  const after = nn(frameAt(T.insEnd + 5).orbit.perigeeM)
  add('durante la inserción el perigeo sube', after > before + 1000, `${(before / 1000).toFixed(0)} → ${(after / 1000).toFixed(0)} km`)
  const deorbitAfter = nn(frameAt(eventTime('deorbit_shutdown') + 5).orbit.perigeeM)
  add('tras la desórbita el perigeo cae dentro de la atmósfera', deorbitAfter < 100_000, `${(deorbitAfter / 1000).toFixed(0)} km`)

  // ---- attitude: schematic, but must be well-formed
  const AT: AttitudeTimes = {
    hotStaging: eventTime('hot_staging'),
    boostbackStart: T.boostbackStart,
    boostbackShutdown: eventTime('boostback_shutdown'),
    boosterLandingStart: eventTime('booster_landing_burn_start'),
    entry: eventTime('entry'),
    shipLandingStart: eventTime('ship_landing_burn_start'),
    deorbitStart: T.deorbitStart,
    deorbitShutdown: eventTime('deorbit_shutdown'),
  }
  let attOk = true
  let upAtStart = false
  let upAtCatch = false
  for (const t of grid) {
    const s = frameAt(t)
    for (const kind of ['ship', 'booster'] as const) {
      const st = s[kind]
      const r = toScene(st.r)
      const v = toScene(st.v)
      const east = new THREE.Vector3(0, 1, 0).cross(r.clone().normalize()).normalize()
      const input = { t, r, v, surfaceSpeedMs: st.surfaceSpeedMs, east }
      const n = noseDirection(kind, input, AT)
      const q = attitudeQuaternion(kind, input, AT)
      attOk &&= near(n.length(), 1, 1e-6) && near(q.length(), 1, 1e-6)
      if (kind === 'ship' && t === 0) upAtStart = n.angleTo(r.clone().normalize()) < 0.2
      if (kind === 'ship' && t === T.catchT) upAtCatch = n.angleTo(r.clone().normalize()) < 0.1
    }
  }
  add('actitud esquemática bien formada en toda la misión', attOk, 'cuaterniones unitarios')
  add('en el despegue y en la catch la Ship apunta hacia arriba', upAtStart && upAtCatch, `${upAtStart} / ${upAtCatch}`)

  // ---- maneuvers: reported / estimated / not evaluable, never "Calculado"
  const mv = buildManeuvers()
  const byId = (id: string) => mv.find((x) => x.id === id)
  add('siete maniobras ordenadas, con despegue y hot-staging', mv.length === 7 && mv.every((x) => x.t1 > x.t0) && mv.every((x, i) => i === 0 || x.t0 >= mv[i - 1].t0) && byId('liftoff') !== undefined && byId('hot-staging') !== undefined, mv.map((x) => x.id).join(' '))
  const ins = byId('insertion')
  add('inserción: 92 m/s reportado, con fuente web y badge Reportado', ins?.dv.kind === 'reported' && ins.dv.valueMs === 92 && /^https?:/.test(ins.dv.source) && dvBadge(ins) === 'reported' && ins.coreValue === 92, `${ins?.dv.kind} ${dvValueText(ins!)}`)
  const deo = byId('deorbit')
  add('desórbita: 58 m/s estimado, con fuente local y badge Estimado', deo?.dv.kind === 'estimate' && deo.dv.valueMs === 58 && !/^https?:/.test(deo.dv.source) && dvBadge(deo) === 'estimate' && deo.coreValue === 58, `${deo?.dv.kind} ${dvValueText(deo!)}`)
  const unk = mv.filter((x) => x.dv.kind === 'unknown')
  add('Δv no publicado: "no evaluable", sin número y sin que el núcleo invente uno', unk.length === 5 && unk.every((x) => x.coreValue === null && dvValueText(x) === 'no evaluable' && dvBadge(x) === 'nodata'), unk.map((x) => x.id).join(' '))
  add('ninguna maniobra usa el badge Calculado', mv.every((x) => dvBadge(x) !== 'calculated'), mv.map(dvBadge).join(' '))

  // ---- HUD honesty
  const rowsShip = telemetryRows(frameAt(T.insStart + 5), 'ship')
  const keys = ['alt', 'vs', 'vi', 'dr', 'g', 'prop', 'eng', 'lat', 'lon', 'peri', 'apo', 'inc', 'per', 'ecc']
  add('HUD completo: 14 magnitudes de la spec', keys.every((k) => rowsShip.some((r) => r.key === k)), `${rowsShip.length} filas`)
  add('HUD: ningún valor calculado se presenta como oficial o reportado', rowsShip.filter((r) => r.key !== 'eng').every((r) => r.badge !== 'official' && r.badge !== 'reported'), rowsShip.map((r) => `${r.key}:${r.badge}`).join(' '))
  const prop = rowsShip.find((r) => r.key === 'prop')!
  add('HUD: propelente estimado o sin dato, nunca oficial', prop.badge === 'estimate' || prop.badge === 'nodata', prop.badge)
  const mecoFrame = frameAt(T.meco + 1)
  const mecoBadge = engineBadge('booster', mecoFrame.time)
  add('MECO: 3 motores del booster marcados como estimado', mecoFrame.boosterEngines === 3 && mecoBadge.badge === 'estimate', `${mecoFrame.boosterEngines} motores, ${mecoBadge.badge}`)
  add('boostback: 32 motores con respaldo oficial', frameAt(T.boostbackStart + 5).boosterEngines === 32 && engineBadge('booster', T.boostbackStart + 5).badge === 'official', engineBadge('booster', T.boostbackStart + 5).badge)
  const boosterRows = telemetryRows(frameAt(300), 'booster')
  add('HUD del booster: elementos orbitales solo para la Ship', boosterRows.filter((r) => ['peri', 'apo', 'inc', 'per', 'ecc'].includes(r.key)).every((r) => r.badge === 'nodata'), 'sin dato')

  // ---- callouts, time scale, labels
  add('textos en pantalla para hover, FTS, swoosh, flip, 3-2-1 y catch', calloutsAt(T.ftsT - 5).length > 0 && calloutsAt(T.ftsT + 5).some((c) => c.kind === 'fts') && calloutsAt(eventTime('subsonic') + 5).length > 0 && calloutsAt(eventTime('landing_flip') + 1).length > 0 && calloutsAt(eventTime('landing_3_to_2') + 1).length > 0 && calloutsAt(T.catchT).some((c) => c.kind === 'catch'), 'ok')
  const times = flight.timeline.map((e) => e.t_sec)
  const sc = buildTimeScale(times, duration)
  let mono = true
  let round = true
  for (let i = 1; i < times.length; i++) {
    if (times[i] > times[i - 1]) mono &&= sc.toPos(times[i]) > sc.toPos(times[i - 1])
    round &&= near(sc.toTime(sc.toPos(times[i])), times[i], 1e-6 * Math.max(1, duration))
  }
  add('barra de tiempo comprimida: creciente y reversible', mono && round && sc.toPos(0) === 0 && sc.toPos(duration) === 1, 'ok')
  const missing = flight.timeline.filter((e) => !EVENT_LABELS[e.id]).map((e) => e.id)
  add('todos los eventos tienen texto en español', missing.length === 0, missing.join(', ') || `${flight.timeline.length} eventos`)

  // ---- entry cut: lines never join a state before the cut with one after it
  const cut = entryHandoff.time
  const mk = () => new Overlays(earthRadiusM, { fts: T.ftsT, entry: cut, deorbitShutdown: eventTime('deorbit_shutdown'), insertionStart: T.insStart, hotStaging: eventTime('hot_staging'), entryCut: cut }, flight.mission.payload.count.value)
  const ctx = (t: number, wall: number, o: { orbit?: boolean; track?: boolean; trails?: boolean } = {}) => ({ t, s: frameAt(t), scale: 1, camDist: 1e5, wall, orbit: o.orbit ?? false, track: o.track ?? true, trails: o.trails ?? true })
  const postRun = mk()
  postRun.update(ctx(cut + 120, 0))
  const spans = (r: [number, number][]) => r.some(([a, b]) => a < cut && b >= cut)
  const sides = (r: [number, number][]) => ({ pre: r.filter(([, b]) => b < cut).length, post: r.filter(([a]) => a >= cut).length })
  add('estela de la Ship: ningún tramo cruza el corte de entrada, hay uno a cada lado', !spans(postRun.ranges.trails) && sides(postRun.ranges.trails).pre === 1 && sides(postRun.ranges.trails).post === 1, JSON.stringify(postRun.ranges.trails))
  add('traza en tierra: ningún tramo cruza el corte de entrada, hay uno a cada lado', !spans(postRun.ranges.track) && sides(postRun.ranges.track).pre === 1 && sides(postRun.ranges.track).post === 1, JSON.stringify(postRun.ranges.track))
  const preRun = mk()
  preRun.update(ctx(cut - 300, 0))
  add('antes del corte hay un solo tramo y termina antes del corte', preRun.ranges.track.length === 1 && preRun.ranges.track[0][1] < cut, JSON.stringify(preRun.ranges.track))
  const pauseRun = mk()
  pauseRun.update(ctx(cut + 600, 0))
  pauseRun.update(ctx(cut + 600, 1000))
  pauseRun.update(ctx(cut + 600, 5000, { orbit: true }))
  add('pausa: sin recalcular estelas ni traza con el mismo T+', pauseRun.rebuilds.trails === 1 && pauseRun.rebuilds.track === 1, JSON.stringify(pauseRun.rebuilds))
  pauseRun.update(ctx(cut + 700, 5100))
  const afterMove = pauseRun.rebuilds.trails
  pauseRun.update(ctx(cut + 700, 5500))
  add('al mover el tiempo se reconstruye una vez, respetando el intervalo mínimo', afterMove === 2 && pauseRun.rebuilds.trails === 2 && pauseRun.rebuilds.track === 2, `${afterMove} → ${JSON.stringify(pauseRun.rebuilds)}`)
  pauseRun.update(ctx(cut + 700, 5510, { trails: false }))
  pauseRun.update(ctx(cut + 700, 5520, { trails: true }))
  add('apagar y volver a prender una capa invalida la caché y reconstruye al instante', pauseRun.rebuilds.trails === 3 && pauseRun.rebuilds.track === 2, JSON.stringify(pauseRun.rebuilds))
  const orbitRuns = mk()
  orbitRuns.update(ctx(30000, 0, { orbit: true }))
  orbitRuns.update(ctx(30000, 100, { orbit: true }))
  add('órbita: una sola reconstrucción en pausa', orbitRuns.rebuilds.orbit === 1, `${orbitRuns.rebuilds.orbit}`)

  // ---- honest badges and Spanish status words
  const stateAt = (t: number, who: 'ship' | 'booster') => frameAt(t)[who]
  add('curvas cinematográficas marcadas Interpolado (entrada de la Ship y desvío del booster)', stateBadge(stateAt(cut + 60, 'ship').method) === 'interpolated' && stateBadge(stateAt(300, 'booster').method) === 'interpolated' && telemetryRows(frameAt(cut + 60), 'ship').find((r) => r.key === 'alt')?.badge === 'interpolated', stateAt(cut + 60, 'ship').method.slice(0, 40))
  add('física ajustada o con pulso estimado marcada Estimado (ascenso, inserción, costa anclada, desórbita)', [30, T.insStart + 5, 20000, eventTime('deorbit_start') + 3].every((t) => stateBadge(stateAt(t, 'ship').method) === 'estimate'), [30, T.insStart + 5, 20000, eventTime('deorbit_start') + 3].map((t) => stateBadge(stateAt(t, 'ship').method)).join(' '))
  add('costa kepleriana sin ajuste sale Calculado', stateBadge(stateAt(T.insStart - 200, 'ship').method) === 'calculated', stateAt(T.insStart - 200, 'ship').method.slice(0, 40))
  add('elementos orbitales siempre Calculado, también en la entrada', ['peri', 'apo', 'inc', 'per', 'ecc'].every((k) => telemetryRows(frameAt(cut + 60), 'ship').find((r) => r.key === k)?.badge === 'calculated'), 'ok')
  const statuses = new Set<string>()
  for (let t = 0; t <= duration; t += 97) {
    const f = frameAt(t)
    statuses.add(f.ship.status)
    statuses.add(f.booster.status)
  }
  const raw = [...statuses].filter((x) => statusEs(x) === x)
  add('todos los estados del núcleo se muestran en español', raw.length === 0, `${statuses.size} estados; sin traducir: ${raw.join(', ') || 'ninguno'}`)

  return out
}
