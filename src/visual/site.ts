import * as THREE from 'three'
import { VISUAL } from './dimensions'

/** Where the stack sits at T=0: on top of the launch mount table. Visual layout, not surveyed. */
export const STACK_BASE_Y = VISUAL.mountHeight + 3.4
/** Tower footprint centre, west of the mount (the arms reach east, to the mount). Schematic. */
export const TOWER_POS = new THREE.Vector3(-46, 0, 0)
/** Pins height of the caught Ship (visual) relative to its base. */
export const CATCH_PIN_OFFSET = 33
export const SUN_DIR = new THREE.Vector3(-0.55, 0.38, 0.74).normalize()

export function coastX(z: number): number {
  return VISUAL.coastEastM + 180 * Math.sin(z / 900) + 90 * Math.sin(z / 230 + 1.3) + 0.02 * z
}

function noiseTexture(base: string, spots: string[], size = 512, count = 5200): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < count; i++) {
    g.fillStyle = spots[i % spots.length]
    const s = 1 + Math.random() * 5
    g.fillRect(Math.random() * size, Math.random() * size, s, s)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function buildSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sun: { value: SUN_DIR.clone() } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sun;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 zenith = vec3(0.07, 0.17, 0.33);
        vec3 mid = vec3(0.42, 0.55, 0.70);
        vec3 horizon = vec3(0.96, 0.74, 0.54);
        vec3 below = vec3(0.16, 0.20, 0.24);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        c = mix(c, zenith, smoothstep(0.12, 0.8, h));
        c = mix(c, below, smoothstep(0.0, -0.12, h));
        float s = max(dot(normalize(vDir), normalize(sun)), 0.0);
        c += vec3(1.0, 0.75, 0.45) * (pow(s, 6.0) * 0.35 + pow(s, 220.0) * 1.2);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
  const m = new THREE.Mesh(new THREE.SphereGeometry(420000, 32, 16), mat)
  m.name = 'sky'
  m.renderOrder = -10
  return m
}

export function buildGround(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'ground'
  const half = 60000

  // Gulf: big flat plane just below zero
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 3, half * 3).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x14434f, metalness: 0.35, roughness: 0.22 }),
  )
  sea.position.y = -0.8
  sea.receiveShadow = false
  g.add(sea)

  // Land: polygon west of the coast line
  const shape = new THREE.Shape()
  const zMin = -half
  const zMax = half
  shape.moveTo(coastX(zMin), -zMin)
  for (let z = zMin; z <= zMax; z += 100) shape.lineTo(coastX(z), -z)
  shape.lineTo(-half * 1.5, -zMax)
  shape.lineTo(-half * 1.5, -zMin)
  shape.closePath()
  const landGeo = new THREE.ShapeGeometry(shape)
  landGeo.rotateX(-Math.PI / 2)
  const tex = noiseTexture('#8c8460', ['#7a7552', '#9b9370', '#6f6b4c', '#a39a78'])
  tex?.repeat.set(2200, 2200)
  // Shape UVs are in metres: scale so the 512 px tile covers ~40 m
  if (tex) tex.repeat.set(1 / 40, 1 / 40)
  const land = new THREE.Mesh(landGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.95, metalness: 0 }))
  land.receiveShadow = true
  g.add(land)

  // Shore foam strip
  const strip: number[] = []
  const idx: number[] = []
  let k = 0
  for (let z = -20000; z <= 20000; z += 80) {
    const x = coastX(z)
    strip.push(x - 6, 0.05, z, x + 26 + 12 * Math.sin(z / 61), 0.05, z)
    if (k > 0) idx.push(k * 2 - 2, k * 2 - 1, k * 2, k * 2 - 1, k * 2 + 1, k * 2)
    k++
  }
  const foamGeo = new THREE.BufferGeometry()
  foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(strip, 3))
  foamGeo.setIndex(idx)
  const foam = new THREE.Mesh(
    foamGeo,
    new THREE.MeshBasicMaterial({ color: 0xe8f1ee, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  )
  g.add(foam)

  // 100 m grid around the pad, for scale reading
  const grid = new THREE.GridHelper(2000, 20, 0x2c3a41, 0x2c3a41)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.22
  grid.position.y = 0.06
  g.add(grid)

  // concrete apron
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

export function buildTower(): Tower {
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
  const armY = VISUAL.catchHeight
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
