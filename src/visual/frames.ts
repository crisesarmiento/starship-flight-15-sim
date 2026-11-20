import * as THREE from 'three'
import type { Vec3 } from './core'

/**
 * Scene axes: ECI z (north) -> three Y (up), ECI x -> X, ECI y -> -Z. Units: metres.
 * The core uses ECI with x through Greenwich at T+0, so the Earth mesh turns about Y by earthAngleRad.
 */
export function toScene(v: Vec3, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(v[0], v[2], -v[1])
}

/** Same rotation as the Earth mesh: ECEF direction at angle theta -> inertial. */
export function ecefToEci(v: THREE.Vector3, theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(v).applyAxisAngle(Y_AXIS, theta)
}
export function eciToEcef(v: THREE.Vector3, theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(v).applyAxisAngle(Y_AXIS, -theta)
}
export const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** Point of the sphere (scene axes, Earth-fixed) for a latitude/longitude and a radius. */
export function geodeticToScene(latDeg: number, lonDeg: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(latDeg)
  const lo = THREE.MathUtils.degToRad(lonDeg)
  return toScene([radius * Math.cos(la) * Math.cos(lo), radius * Math.cos(la) * Math.sin(lo), radius * Math.sin(la)], out)
}

export interface Enu {
  east: THREE.Vector3
  up: THREE.Vector3
  south: THREE.Vector3
}

/** Local frame at a site, Earth-fixed. Local scene group: x east, y up, z south. */
export function enuAt(latDeg: number, lonDeg: number): Enu {
  const la = THREE.MathUtils.degToRad(latDeg)
  const lo = THREE.MathUtils.degToRad(lonDeg)
  const east = toScene([-Math.sin(lo), Math.cos(lo), 0])
  const north = toScene([-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)])
  const up = toScene([Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)])
  return { east, up, south: north.clone().negate() }
}

export function enuMatrix(e: Enu, position: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(e.east, e.up, e.south).setPosition(position)
}

/**
 * Sun direction in inertial axes, for lighting only.
 * Approximate sub-solar point at the reported liftoff (13 Nov, ~22:47 UTC): longitude ~ -166 deg, declination ~ -18 deg.
 * It is held fixed over the 22 h (the sun moves < 1 deg), so the pad sees an afternoon sun at launch.
 */
export const SUN_DIRECTION: THREE.Vector3 = (() => {
  const lon = THREE.MathUtils.degToRad(-165.7)
  const dec = THREE.MathUtils.degToRad(-18.1)
  return toScene([Math.cos(dec) * Math.cos(lon), Math.cos(dec) * Math.sin(lon), Math.sin(dec)]).normalize()
})()

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface AttitudeInput {
  t: number
  r: THREE.Vector3
  v: THREE.Vector3
  surfaceSpeedMs: number
  /** East at the vehicle, used as a fixed roll reference. */
  east: THREE.Vector3
}

export interface AttitudeTimes {
  hotStaging: number
  boostbackStart: number
  boostbackShutdown: number
  boosterLandingStart: number
  entry: number
  shipLandingStart: number
  deorbitStart: number
  deorbitShutdown: number
}

function slerpDir(a: THREE.Vector3, b: THREE.Vector3, k: number): THREE.Vector3 {
  const qa = new THREE.Quaternion().setFromUnitVectors(a, a)
  const q = new THREE.Quaternion().setFromUnitVectors(a, b)
  return a.clone().applyQuaternion(qa.slerp(q, k)).normalize()
}

/**
 * Where the nose points. SCHEMATIC: the core sends only r and v, so the attitude is a visual rule per phase
 * (prograde in ascent, flip for boostback, belly-first entry, landing flip). It is not telemetry.
 */
export function noseDirection(kind: 'ship' | 'booster', a: AttitudeInput, T: AttitudeTimes): THREE.Vector3 {
  const rHat = a.r.clone().normalize()
  const vHat = a.v.lengthSq() > 1e-6 ? a.v.clone().normalize() : rHat.clone()
  const flow = smooth(30, 300, a.surfaceSpeedMs)
  const ascent = rHat.clone().lerp(vHat, flow).normalize()
  const back = vHat.clone().negate()

  if (kind === 'booster') {
    if (a.t < T.hotStaging) return ascent
    if (a.t < T.boostbackStart) return slerpDir(ascent, back, smooth(T.hotStaging, T.boostbackStart, a.t))
    if (a.t < T.boosterLandingStart) return back
    return slerpDir(back, rHat, smooth(T.boosterLandingStart, T.boosterLandingStart + 10, a.t))
  }

  // ship
  if (a.t < T.deorbitStart - 40) return a.t < 700 ? ascent : vHat
  if (a.t < T.deorbitStart) return slerpDir(vHat, back, smooth(T.deorbitStart - 40, T.deorbitStart, a.t))
  if (a.t < T.deorbitShutdown) return back
  if (a.t < T.deorbitShutdown + 40) return slerpDir(back, vHat, smooth(T.deorbitShutdown, T.deorbitShutdown + 40, a.t))
  if (a.t < T.shipLandingStart) {
    // belly-first entry: nose held 25 degrees above the flight path
    const bellyNose = vHat.clone().multiplyScalar(Math.cos(0.436)).addScaledVector(rHat, Math.sin(0.436)).normalize()
    return slerpDir(vHat, bellyNose, smooth(T.entry - 120, T.entry, a.t))
  }
  const bellyNose = vHat.clone().multiplyScalar(Math.cos(0.436)).addScaledVector(rHat, Math.sin(0.436)).normalize()
  return slerpDir(bellyNose, rHat, smooth(T.shipLandingStart, T.shipLandingStart + 10, a.t))
}

/** Heat-shield side (body +x) faces the flow during entry, otherwise a fixed east reference. */
export function attitudeQuaternion(kind: 'ship' | 'booster', a: AttitudeInput, T: AttitudeTimes): THREE.Quaternion {
  const nose = noseDirection(kind, a, T)
  const vHat = a.v.lengthSq() > 1e-6 ? a.v.clone().normalize() : nose.clone()
  const windward = kind === 'ship' ? smooth(T.entry - 120, T.entry, a.t) * (1 - smooth(T.shipLandingStart, T.shipLandingStart + 10, a.t)) : 0
  const xRef = a.east.clone().lerp(vHat, windward)
  xRef.addScaledVector(nose, -xRef.dot(nose))
  if (xRef.lengthSq() < 1e-8) xRef.copy(a.east).addScaledVector(nose, -a.east.dot(nose))
  if (xRef.lengthSq() < 1e-8) xRef.set(1, 0, 0).addScaledVector(nose, -nose.x)
  xRef.normalize()
  const z = new THREE.Vector3().crossVectors(xRef, nose).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xRef, nose, z))
}
