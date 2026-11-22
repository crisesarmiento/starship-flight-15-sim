import { flight } from '../flight'

export type Vec3 = [number, number, number]
export type State = { r: Vec3; v: Vec3 }

export const { earth_mu_m3_s2: { value: mu }, earth_radius_m: { value: earthRadiusM },
  earth_rotation_rad_s: { value: rotationRate }, g0_m_s2: { value: g0 } } = flight.constants
export const deg = Math.PI / 180
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
]
export const norm = (a: Vec3) => Math.hypot(...a)
export const unit = (a: Vec3) => scale(a, 1 / norm(a))
export const zero = (): Vec3 => [0, 0, 0]
export const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x))
export const gravity = (r: Vec3) => scale(r, -mu / norm(r) ** 3)
export const spinVelocity = (r: Vec3): Vec3 => [-rotationRate * r[1], rotationRate * r[0], 0]
export const earthAngleAt = (time: number) => (rotationRate * time) % (2 * Math.PI)

export function rotate(r: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [c * r[0] - s * r[1], s * r[0] + c * r[1], r[2]]
}

export function fromFixed(state: State, time: number): State {
  const angle = earthAngleAt(time)
  const r = rotate(state.r, angle)
  return { r, v: add(rotate(state.v, angle), spinVelocity(r)) }
}

export function toFixed(state: State, time: number): State {
  const angle = -earthAngleAt(time)
  return { r: rotate(state.r, angle), v: rotate(sub(state.v, spinVelocity(state.r)), angle) }
}

const lat = flight.site.latitude_deg.value * deg
const lon = flight.site.longitude_deg.value * deg
export const padUp: Vec3 = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
export const padEast: Vec3 = [-Math.sin(lon), Math.cos(lon), 0]
const padNorth = cross(padUp, padEast)

export function localPoint(eastM: number, northM: number, altitudeM: number): Vec3 {
  const d = Math.hypot(eastM, northM)
  if (d === 0) return scale(padUp, earthRadiusM + altitudeM)
  const tangent = scale(add(scale(padEast, eastM), scale(padNorth, northM)), 1 / d)
  const angle = d / earthRadiusM
  return scale(add(scale(padUp, Math.cos(angle)), scale(tangent, Math.sin(angle))), earthRadiusM + altitudeM)
}

export function timeAt(id: string): number {
  const event = flight.timeline.find(e => e.id === id)
  if (!event) throw new Error(`Missing event ${id}`)
  return event.t_sec
}
