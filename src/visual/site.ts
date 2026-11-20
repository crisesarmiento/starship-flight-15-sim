import * as THREE from 'three'
import { VISUAL } from './dimensions'

/** Where the stack sits at T=0: on top of the launch mount table. Visual layout, not surveyed. */
export const STACK_BASE_Y = VISUAL.mountHeight + 3.4
/** Tower footprint centre, west of the mount (the arms reach east, to the mount). Schematic. */
export const TOWER_POS = new THREE.Vector3(-46, 0, 0)
/** Height of the catch pins above the Ship's base (visual). */
export const CATCH_PIN_OFFSET = 33

/** Concrete apron and a 100 m grid, so the scale reads at the pad. */
export function buildApron(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'apron'
  const grid = new THREE.GridHelper(2000, 20, 0x2c3a41, 0x2c3a41)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.2
  grid.position.y = 0.06
  g.add(grid)
  const apron = new THREE.Mesh(
    new THREE.CylinderGeometry(78, 78, 0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x8e908d, roughness: 0.9 }),
  )
  apron.position.y = 0.1
  apron.receiveShadow = true
  g.add(apron)
  return g
}

export interface Tower {
  group: THREE.Group
  /** 0 = arms open, 1 = arms closed (caught). */
  setArms(k: number): void
}

export function buildMount(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'launch-mount'
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a4045, metalness: 0.75, roughness: 0.5 })
  const H = VISUAL.mountHeight
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, H, 2.2), mat)
    leg.position.set(Math.cos(a) * 11.5, H / 2, Math.sin(a) * 11.5)
    leg.castShadow = true
    g.add(leg)
  }
  const table = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3.2, 48), mat)
  table.position.y = H + 1.6
  table.castShadow = true
  table.receiveShadow = true
  g.add(table)
  // flame deflector pit under the table
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 12, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x2a2b2b, roughness: 1 }),
  )
  pit.position.y = 0.4
  g.add(pit)
  return g
}

/** `armY`: height of the catch arms above the ground, in this schematic tower. */
export function buildTower(armY: number): Tower {
  const g = new THREE.Group()
  g.name = 'tower'
  const H = VISUAL.towerHeight
  const S = VISUAL.towerSide
  const mat = new THREE.MeshStandardMaterial({ color: 0x59636a, metalness: 0.7, roughness: 0.5 })
  const chordGeo = new THREE.BoxGeometry(1, 1, 1)

  // four chords
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(chordGeo, mat)
      c.scale.set(1.1, H, 1.1)
      c.position.set((sx * S) / 2, H / 2, (sz * S) / 2)
      c.castShadow = true
      g.add(c)
    }

  // braces as one instanced mesh
  const levels = Math.floor(H / 9)
  const per = 4 /* faces */ * 3 /* horizontal + diagonal x2 */
  const braces = new THREE.InstancedMesh(chordGeo, mat, levels * per)
  const d = new THREE.Object3D()
  let n = 0
  const put = (a: THREE.Vector3, b: THREE.Vector3, t: number) => {
    d.position.copy(a).add(b).multiplyScalar(0.5)
    d.lookAt(b)
    d.scale.set(t, t, a.distanceTo(b))
    d.updateMatrix()
    braces.setMatrixAt(n++, d.matrix)
  }
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => new THREE.Vector3((x * S) / 2, 0, (z * S) / 2))
  for (let l = 0; l < levels; l++) {
    const y0 = l * 9
    const y1 = y0 + 9
    for (let f = 0; f < 4; f++) {
      const a = corners[f]
      const b = corners[(f + 1) % 4]
      put(new THREE.Vector3(a.x, y1, a.z), new THREE.Vector3(b.x, y1, b.z), 0.45)
      put(new THREE.Vector3(a.x, y0, a.z), new THREE.Vector3(b.x, y1, b.z), 0.4)
      put(new THREE.Vector3(b.x, y0, b.z), new THREE.Vector3(a.x, y1, a.z), 0.4)
    }
  }
  braces.count = n
  braces.castShadow = true
  g.add(braces)

  // lightning mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 22, 8), mat)
  mast.position.y = H + 11
  g.add(mast)

  // carriage + two arms (chopsticks)
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(7, 11, S + 3), new THREE.MeshStandardMaterial({ color: 0x2f3539, metalness: 0.7, roughness: 0.5 }))
  carriage.position.set(S / 2 + 3.5, armY, 0)
  carriage.castShadow = true
  g.add(carriage)

  const armMat = new THREE.MeshStandardMaterial({ color: 0xc7ccce, metalness: 0.85, roughness: 0.4 })
  const arms: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group()
    hinge.position.set(S / 2 + 7, armY, side * (S / 2 + 1.5))
    const arm = new THREE.Mesh(new THREE.BoxGeometry(34, 5, 2.6), armMat)
    arm.position.set(17, 0, 0)
    arm.castShadow = true
    hinge.add(arm)
    // pad where the pins rest
    const pad = new THREE.Mesh(new THREE.BoxGeometry(5, 6.5, 3.4), new THREE.MeshStandardMaterial({ color: 0x23282c, metalness: 0.6, roughness: 0.6 }))
    pad.position.set(31, 0, -side * 0.4)
    hinge.add(pad)
    hinge.userData.side = side
    arms.push(hinge)
    g.add(hinge)
  }
  // Closed arms meet the ship ~ 4.5 m beyond the tower side; open ones spread out ~38 deg.
  const setArms = (k: number) => {
    for (const h of arms) {
      const side = h.userData.side as number
      const openAngle = THREE.MathUtils.degToRad(38)
      const closedAngle = THREE.MathUtils.degToRad(-Math.atan2(S / 2 + 1.5 - 5.2, 31) * (180 / Math.PI))
      // side +1 sits at +z: opening turns toward +z, which is a negative rotation about y
      const a = THREE.MathUtils.lerp(openAngle, closedAngle, k)
      h.rotation.y = -side * a
    }
  }
  setArms(0)
  g.position.copy(TOWER_POS)
  return { group: g, setArms }
}
