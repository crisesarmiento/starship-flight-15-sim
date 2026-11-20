import * as THREE from 'three'
import { duration, flight, frameAt } from './core'
import { VISUAL, boosterEngineLayout, measuredFrom, shipEngineLayout } from './dimensions'
import { EVENT_LABELS } from './labels'
import { buildRoutes, isOverGulf, sampleRoute } from './route'
import { telemetryRows } from './telemetry'
import { buildTimeScale } from './timeScale'
import { buildBooster, buildShip } from './vehicles'

export interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol

function bodyBox(parts: THREE.Mesh[], group: THREE.Group): THREE.Box3 {
  group.updateMatrixWorld(true)
  const box = new THREE.Box3()
  for (const p of parts) box.union(new THREE.Box3().setFromObject(p))
  return box
}

function minGap(pts: { x: number; z: number; r: number }[]): number {
  let worst = Infinity
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      worst = Math.min(worst, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) - pts[i].r - pts[j].r)
  return worst
}

/** Focused checks for the static scene (stage 2) and the clock/HUD inputs (stage 3). */
export function runVisualChecks(): CheckResult[] {
  const out: CheckResult[] = []
  const add = (name: string, ok: boolean, detail: string) => out.push({ name, ok, detail })
  const m = measuredFrom(flight)

  // ---- stage 2: measured dimensions of the built models
  const booster = buildBooster(m)
  const ship = buildShip(m)
  const bb = bodyBox(booster.bodies, booster.group)
  const sb = bodyBox(ship.bodies, ship.group)
  const bs = bb.getSize(new THREE.Vector3())
  const ss = sb.getSize(new THREE.Vector3())
  add('booster 72 m de alto', near(bs.y, 72, 1e-3), `${bs.y.toFixed(3)} m`)
  add('ship 52 m de alto', near(ss.y, 52, 1e-3), `${ss.y.toFixed(3)} m`)
  add('stack = 124 m', near(bs.y + ss.y, 124, 1e-3), `${(bs.y + ss.y).toFixed(3)} m`)
  add('booster diámetro 9 m', near(bs.x, 9, 0.05) && near(bs.z, 9, 0.05), `${bs.x.toFixed(3)} x ${bs.z.toFixed(3)} m`)
  add('ship diámetro 9 m', near(ss.x, 9, 0.05) && near(ss.z, 9, 0.05), `${ss.x.toFixed(3)} x ${ss.z.toFixed(3)} m`)
  add('booster base en y=0 y ship apoya sobre el booster', near(bb.min.y, 0, 1e-6) && near(sb.min.y, 0, 1e-6), `${bb.min.y} / ${sb.min.y}`)

  add('booster con 33 motores (13 centrales + 20 perimetrales)', booster.engines.length === 33 && boosterEngineLayout(m).filter((e) => e.ring !== 'outer').length === 13, `${booster.engines.length} motores, ${booster.plumes.length} plumas`)
  add('ship con 6 motores (3 nivel del mar + 3 vacío)', ship.engines.length === 6 && shipEngineLayout(m).filter((e) => e.kind === 'sl').length === 3, `${ship.engines.length} motores`)
  add('booster con 3 grid fins (no 4)', booster.gridFins.length === 3, `${booster.gridFins.length}`)

  const bl = boosterEngineLayout(m).map((e) => ({ x: e.x, z: e.z, r: VISUAL.bellRadius }))
  const sl = shipEngineLayout(m).map((e) => ({ x: e.x, z: e.z, r: e.kind === 'vac' ? VISUAL.vacBellRadius : VISUAL.bellRadius }))
  add('motores del booster sin superponerse', minGap(bl) >= -1e-9, `hueco mínimo ${minGap(bl).toFixed(3)} m`)
  add('motores de la Ship sin superponerse', minGap(sl) >= -1e-9, `hueco mínimo ${minGap(sl).toFixed(3)} m`)
  const inside = (pts: { x: number; z: number; r: number }[]) => pts.every((p) => Math.hypot(p.x, p.z) + p.r <= m.diameter / 2)
  add('motores dentro del casco de 9 m', inside(bl) && inside(sl), 'ok')

  booster.setEngines(32)
  ship.setEngines(3)
  const lit = (r: typeof booster) => r.plumes.filter((p) => p.visible).length
  add('plumas siguen el recuento (32 y 3)', lit(booster) === 32 && lit(ship) === 3, `${lit(booster)} / ${lit(ship)}`)

  // ---- stage 3: route, scale, HUD honesty
  const routes = buildRoutes(flight.timeline, flight.mission.orbit.orbits_approx.value ?? 14)
  const catchT = flight.timeline.find((e) => e.id === 'ship_catch')!.t_sec
  const ftsT = flight.timeline.find((e) => e.id === 'booster_fts')!.t_sec
  const fts = routes.booster.pos(ftsT)
  const catchPos = routes.ship.pos(catchT)
  const planned = routes.planned.pos(ftsT)
  add('FTS del booster cae sobre el Golfo', isOverGulf(fts[0], fts[2]), `x=${fts[0]} z=${fts[2]}`)
  add('la Ship termina en la torre (catch)', Math.hypot(catchPos[0], catchPos[2]) < 1, `x=${catchPos[0]} z=${catchPos[2]}`)
  add('FTS y catch planificada del booster están separados', Math.hypot(fts[0] - planned[0], fts[2] - planned[2]) > 30, 'el booster no vuelve a la torre')
  add('la ruta del booster termina en FTS', routes.booster.keys[routes.booster.keys.length - 1].t >= ftsT, `${routes.booster.keys[routes.booster.keys.length - 1].t}`)

  for (const r of [routes.booster, routes.ship, routes.planned]) {
    const strictly = r.keys.every((k, i) => i === 0 || k.t > r.keys[i - 1].t)
    add(`tiempos de la ruta ${r.id} crecientes`, strictly, `${r.keys.length} puntos`)
  }
  let finite = true
  for (let t = 0; t <= duration; t += 37) for (const r of [routes.booster, routes.ship]) finite &&= r.pos(t).every(Number.isFinite)
  add('la ruta tiene posición válida durante toda la misión', finite, `0..${duration} s`)

  const runs = sampleRoute(routes.ship)
  add('ruta de la Ship dibujada en tramos (antes y después de la costa orbital)', runs.length === 2, `${runs.length} tramos`)
  const orbitIdKeys = ['insertion_shutdown', 'deorbit_start'].every((id) => routes.ship.keys.some((k) => k.id === id))
  add('costa orbital marcada entre inserción y desórbita', !!routes.ship.orbit && orbitIdKeys, JSON.stringify(routes.ship.orbit))

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

  const rows = telemetryRows(frameAt(0))
  const alt = rows.find((r) => r.key === 'alt')!
  add('HUD: la altitud placeholder no se presenta como oficial', alt.badge === 'placeholder', alt.badge)
  add('HUD: ningún valor del núcleo se marca oficial o reportado', rows.every((r) => r.badge !== 'official' && r.badge !== 'reported'), rows.map((r) => `${r.key}:${r.badge}`).join(' '))
  add('HUD: masa sin dato, no inventada', rows.find((r) => r.key === 'mass')!.badge === 'nodata', 'no modelada')

  const f0 = frameAt(0)
  const fEnd = frameAt(duration)
  add('el núcleo responde en T+0 y al final', f0.event?.id === 'liftoff' && fEnd.event?.id === 'ship_catch', `${f0.event?.id} / ${fEnd.event?.id}`)
  const bPre = frameAt(ftsT - 1).boosterEngines
  const bPost = frameAt(ftsT).boosterEngines
  add('booster sin motores al FTS', bPre === 13 && bPost === 0, `${bPre} -> ${bPost}`)

  return out
}
