import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/** Thick screen-space polyline with a fixed capacity, updated in place (no GPU buffer churn). */
export class DynLine {
  readonly line: Line2
  readonly material: LineMaterial
  private readonly geo: LineGeometry
  private readonly data: THREE.InstancedInterleavedBuffer
  private readonly cap: number

  constructor(capacity: number, color: number, width: number, opacity = 1) {
    this.cap = capacity
    this.geo = new LineGeometry()
    this.geo.setPositions(new Float32Array(capacity * 3))
    const attr = this.geo.getAttribute('instanceStart')
    if (!(attr instanceof THREE.InterleavedBufferAttribute) || !(attr.data instanceof THREE.InstancedInterleavedBuffer)) {
      throw new Error('LineGeometry changed its internal format')
    }
    this.data = attr.data
    this.material = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, worldUnits: false })
    this.line = new Line2(this.geo, this.material)
    this.line.frustumCulled = false
    this.line.visible = false
  }

  /** Flat xyz array; more points than capacity are thinned evenly. */
  set(xyz: ArrayLike<number>, count = Math.floor(xyz.length / 3)): void {
    if (count < 2) {
      this.line.visible = false
      return
    }
    const step = count > this.cap ? (count - 1) / (this.cap - 1) : 1
    const n = Math.min(count, this.cap)
    const arr = this.data.array as Float32Array
    let prev = 0
    for (let i = 0; i < n; i++) {
      const k = Math.min(count - 1, Math.round(i * step))
      if (i > 0) {
        const o = (i - 1) * 6
        arr[o] = xyz[prev * 3]
        arr[o + 1] = xyz[prev * 3 + 1]
        arr[o + 2] = xyz[prev * 3 + 2]
        arr[o + 3] = xyz[k * 3]
        arr[o + 4] = xyz[k * 3 + 1]
        arr[o + 5] = xyz[k * 3 + 2]
      }
      prev = k
    }
    this.data.needsUpdate = true
    this.geo.instanceCount = n - 1
    this.line.visible = true
  }

  hide(): void {
    this.line.visible = false
  }

  setResolution(w: number, h: number): void {
    this.material.resolution.set(w, h)
  }

  dispose(): void {
    this.geo.dispose()
    this.material.dispose()
  }
}
