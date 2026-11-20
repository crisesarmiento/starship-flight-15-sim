import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Y_AXIS } from './frames'

export type CameraMode = 'earth' | 'orbit' | 'ship' | 'booster' | 'pad' | 'free'

export const CAMERA_MODES: CameraMode[] = ['earth', 'orbit', 'ship', 'booster', 'pad', 'free']

/** Where each mode looks, in the inertial frame. `up` is the direction that becomes "up" on screen. */
export interface FocusPoint {
  origin: THREE.Vector3
  up: THREE.Vector3
}

export interface FocusSet {
  ship: FocusPoint
  booster: FocusPoint
  pad: FocusPoint
  /** Orbit-plane normal of the Ship, or null if not defined. */
  orbitNormal: THREE.Vector3 | null
  earthRadius: number
  shipRadius: number
}

/** Rotation that turns the local frame at `up` (east, up, south) into scene axes (x, y, z). */
export function worldQuaternionFor(up: THREE.Vector3): THREE.Quaternion {
  const u = up.clone().normalize()
  let east = new THREE.Vector3().crossVectors(Y_AXIS, u)
  if (east.lengthSq() < 1e-8) east = new THREE.Vector3(0, 0, -1)
  east.normalize()
  const south = new THREE.Vector3().crossVectors(east, u).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, u, south)).invert()
}

interface Preset {
  distance: number
  /** Camera direction from the target, in the scene frame (y up). */
  direction: THREE.Vector3
  min: number
  max: number
  polar: number
}

const ease = (k: number) => k * k * (3 - 2 * k)
const TRANSITION_S = 1.6

/**
 * Floating-origin camera. The world group is moved and turned so the focus sits at the origin with its
 * local "up" on +Y; OrbitControls then works in a stable frame with no precision trouble at Earth scale.
 */
export class CameraRig {
  mode: CameraMode = 'earth'
  readonly controls: OrbitControls
  private fromOrigin = new THREE.Vector3()
  private fromQuat = new THREE.Quaternion()
  private origin = new THREE.Vector3()
  private quat = new THREE.Quaternion()
  private frozen: { origin: THREE.Vector3; quat: THREE.Quaternion } | null = null
  private progress = 1
  private fromDistance = 1
  private targetDistance = 1
  private initialised = false

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
    readonly world: THREE.Object3D,
    private readonly earthRadius: number,
  ) {
    this.controls = new OrbitControls(camera, dom)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = true
    this.controls.rotateSpeed = 0.7
    this.controls.zoomSpeed = 1.1
    this.camera.near = 0.5
    this.camera.far = 5e9
  }

  private preset(mode: CameraMode, f: FocusSet): Preset {
    const R = this.earthRadius
    switch (mode) {
      case 'earth':
        return { distance: R * 3.5, direction: new THREE.Vector3(0.45, 0.3, 0.84), min: 200, max: R * 40, polar: Math.PI }
      case 'orbit':
        return { distance: Math.max(R * 2.6, f.shipRadius * 2.7), direction: new THREE.Vector3(0.35, 0.8, 0.5), min: 200, max: R * 40, polar: Math.PI }
      case 'ship':
        return { distance: 190, direction: new THREE.Vector3(-0.55, 0.22, 0.8), min: 12, max: R * 10, polar: Math.PI }
      case 'booster':
        return { distance: 220, direction: new THREE.Vector3(-0.55, 0.2, 0.8), min: 12, max: R * 10, polar: Math.PI }
      case 'pad':
        return { distance: 400, direction: new THREE.Vector3(-0.3, 0.12, 0.95), min: 25, max: 2e5, polar: Math.PI * 0.49 }
      default:
        return { distance: this.currentDistance(), direction: this.currentDirection(), min: 5, max: R * 40, polar: Math.PI }
    }
  }

  currentDistance(): number {
    return this.camera.position.distanceTo(this.controls.target)
  }

  private currentDirection(): THREE.Vector3 {
    return this.camera.position.clone().sub(this.controls.target).normalize()
  }

  private desired(f: FocusSet): { origin: THREE.Vector3; quat: THREE.Quaternion } {
    switch (this.mode) {
      case 'earth':
        return { origin: new THREE.Vector3(), quat: new THREE.Quaternion() }
      case 'orbit':
        return { origin: new THREE.Vector3(), quat: worldQuaternionFor(f.orbitNormal ?? Y_AXIS) }
      case 'ship':
        return { origin: f.ship.origin, quat: worldQuaternionFor(f.ship.up) }
      case 'booster':
        return { origin: f.booster.origin, quat: worldQuaternionFor(f.booster.up) }
      case 'pad':
        return { origin: f.pad.origin, quat: worldQuaternionFor(f.pad.up) }
      default:
        return this.frozen ?? { origin: this.origin.clone(), quat: this.quat.clone() }
    }
  }

  /** Switch mode with a smooth glide. `hard` also resets the camera direction. */
  setMode(mode: CameraMode, f: FocusSet, hard = false): void {
    if (this.initialised && mode === this.mode && !hard) return
    const first = !this.initialised
    this.fromOrigin.copy(this.origin)
    this.fromQuat.copy(this.quat)
    if (mode === 'free') this.frozen = { origin: this.origin.clone(), quat: this.quat.clone() }
    else this.frozen = null
    this.mode = mode
    const p = this.preset(mode, f)
    this.controls.minDistance = p.min
    this.controls.maxDistance = p.max
    this.controls.maxPolarAngle = p.polar
    if (mode !== 'free') {
      this.fromDistance = first ? p.distance : this.currentDistance()
      this.targetDistance = p.distance
      this.controls.target.set(0, mode === 'pad' ? 0 : 0, 0)
      if (first || hard) this.camera.position.copy(p.direction.clone().normalize().multiplyScalar(p.distance))
      else this.camera.position.copy(this.currentDirectionFrom(this.camera.position).multiplyScalar(this.fromDistance))
    }
    this.progress = first ? 1 : 0
    if (first) {
      const d = this.desired(f)
      this.origin.copy(d.origin)
      this.quat.copy(d.quat)
    }
    this.initialised = true
  }

  private currentDirectionFrom(p: THREE.Vector3): THREE.Vector3 {
    return p.clone().sub(this.controls.target).normalize()
  }

  update(dt: number, f: FocusSet): void {
    if (this.progress < 1) this.progress = Math.min(1, this.progress + dt / TRANSITION_S)
    const k = ease(this.progress)
    const d = this.desired(f)
    if (this.progress < 1) {
      this.origin.lerpVectors(this.fromOrigin, d.origin, k)
      this.quat.slerpQuaternions(this.fromQuat, d.quat, k)
      if (this.mode !== 'free') {
        const dir = this.currentDirectionFrom(this.camera.position)
        const dist = THREE.MathUtils.lerp(this.fromDistance, this.targetDistance, k)
        this.camera.position.copy(this.controls.target).addScaledVector(dir, dist)
      }
    } else {
      this.origin.copy(d.origin)
      this.quat.copy(d.quat)
    }
    this.world.quaternion.copy(this.quat)
    this.world.position.copy(this.origin).applyQuaternion(this.quat).negate()
    this.world.updateMatrixWorld(true)
    this.controls.update()
  }

  /** Back to the preset view of the current mode. */
  reset(f: FocusSet): void {
    const m = this.mode === 'free' ? 'earth' : this.mode
    this.setMode(m, f, true)
    this.controls.update()
  }

  get worldQuat(): THREE.Quaternion {
    return this.quat
  }

  dispose(): void {
    this.controls.dispose()
  }
}
