import * as THREE from 'three'
import { LAND } from './geo'
import { VISUAL } from './dimensions'

export const PATCH_RADIUS_M = 90_000

/** Shore line of the local patch, east of the pad (schematic). Mirrors the shader. */
export function coastX(z: number): number {
  return VISUAL.coastEastM + 180 * Math.sin(z / 900) + 90 * Math.sin(z / 230 + 1.3) + 0.02 * z
}

function earthTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const W = 4096
  const H = 2048
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return null
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0c3350')
  grad.addColorStop(0.5, '#0b4560')
  grad.addColorStop(1, '#0c3350')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  const px = (lon: number) => ((lon + 180) / 360) * W
  const py = (lat: number) => ((90 - lat) / 180) * H
  for (const [name, ring] of Object.entries(LAND)) {
    g.beginPath()
    ring.forEach(([lo, la], i) => (i ? g.lineTo(px(lo), py(la)) : g.moveTo(px(lo), py(la))))
    g.closePath()
    g.fillStyle = name === 'antarctica' || name === 'greenland' ? '#d6dde0' : '#53663f'
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = 'rgba(190, 210, 190, 0.55)'
    g.stroke()
  }
  // speckle so the land is not flat
  const img = g.getImageData(0, 0, W, H).data
  for (let i = 0; i < 90000; i++) {
    const x = Math.floor(Math.random() * W)
    const y = Math.floor(Math.random() * H)
    const o = (y * W + x) * 4
    if (img[o] > 60 && img[o] < 110 && img[o + 1] > 90 && img[o + 1] < 120 && img[o + 2] < 90) {
      g.fillStyle = Math.random() > 0.5 ? 'rgba(130,120,80,0.22)' : 'rgba(30,60,30,0.2)'
      g.fillRect(x, y, 2 + Math.random() * 8, 2 + Math.random() * 6)
    }
  }
  // graticule every 15 degrees
  g.strokeStyle = 'rgba(255,255,255,0.10)'
  g.lineWidth = 1
  for (let lo = -180; lo <= 180; lo += 15) {
    g.beginPath()
    g.moveTo(px(lo), 0)
    g.lineTo(px(lo), H)
    g.stroke()
  }
  for (let la = -75; la <= 75; la += 15) {
    g.beginPath()
    g.moveTo(0, py(la))
    g.lineTo(W, py(la))
    g.stroke()
  }
  g.strokeStyle = 'rgba(255,190,120,0.28)'
  g.beginPath()
  g.moveTo(0, py(0))
  g.lineTo(W, py(0))
  g.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export interface EarthRig {
  /** Rotates with earthAngleRad. Everything Earth-fixed goes inside. */
  group: THREE.Group
  mesh: THREE.Mesh
  atmosphere: THREE.Mesh
  setSun(directionInScene: THREE.Vector3): void
}

export function buildEarth(radius: number): EarthRig {
  const group = new THREE.Group()
  group.name = 'earth'
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: earthTexture(), roughness: 0.95, metalness: 0 })
  if (!mat.map) mat.color.set(0x2f5f78)
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 512, 256), mat)
  mesh.receiveShadow = false
  // three's sphere maps u=0.5 to +X, which is Greenwich in the core's inertial axes: no extra turn needed
  group.add(mesh)

  const sun = { value: new THREE.Vector3(1, 0, 0) }
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius + 95_000, 96, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { sun },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vW = normalize((modelMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 sun; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main() {
          float f = pow(1.0 - abs(dot(vN, vV)), 3.2);
          float lit = smoothstep(-0.25, 0.45, dot(normalize(vW), sun));
          gl_FragColor = vec4(vec3(0.28, 0.56, 1.0) * f * (0.12 + 0.95 * lit), f * lit);
        }`,
    }),
  )
  atmosphere.renderOrder = 3
  group.add(atmosphere)

  return {
    group,
    mesh,
    atmosphere,
    setSun(d) {
      sun.value.copy(d)
    },
  }
}

/** Curved local ground around the pad: sphere drop, shore line and sand/Gulf colours done in the shader. */
export function buildPadTerrain(earthRadius: number): THREE.Mesh {
  const rings = 110
  const segs = 160
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= rings; i++) {
    const r = PATCH_RADIUS_M * Math.pow(i / rings, 2.2)
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const drop = earthRadius - Math.sqrt(Math.max(0, earthRadius * earthRadius - r * r))
      pos.push(x, -drop - 0.8, z)
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j
      const b = i * segs + ((j + 1) % segs)
      const c = (i + 1) * segs + j
      const d = (i + 1) * segs + ((j + 1) % segs)
      idx.push(a, c, b, b, c, d)
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  // normals of a curved cap: keep them radial-up so lighting is smooth
  const n = geo.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < n.count; i++) {
    const x = geo.getAttribute('position').getX(i)
    const z = geo.getAttribute('position').getZ(i)
    const k = Math.hypot(x, z) / earthRadius
    n.setXYZ(i, (x / earthRadius), Math.sqrt(Math.max(0, 1 - k * k)), (z / earthRadius))
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, transparent: true })
  mat.polygonOffset = true
  mat.polygonOffsetFactor = -2
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.coastBase = { value: VISUAL.coastEastM }
    sh.uniforms.rmax = { value: PATCH_RADIUS_M }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLoc; uniform float coastBase; uniform float rmax;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`,
      )
      .replace(
        '#include <color_fragment>',
        `float cx = coastBase + 180.0*sin(vLoc.z/900.0) + 90.0*sin(vLoc.z/230.0+1.3) + 0.02*vLoc.z;
        float s = vLoc.x - cx;
        float n1 = vn(vLoc.xz/35.0), n2 = vn(vLoc.xz/420.0);
        vec3 land = mix(vec3(0.50,0.47,0.33), vec3(0.40,0.40,0.27), n2) * (0.88 + 0.24*n1);
        vec3 sand = vec3(0.80,0.74,0.58);
        vec3 sea = mix(vec3(0.05,0.30,0.33), vec3(0.03,0.15,0.24), smoothstep(0.0, 2500.0, s));
        float beach = 1.0 - smoothstep(-90.0, -4.0, s);
        vec3 col = mix(sand, land, beach);
        col = s > 0.0 ? sea : col;
        float foam = (1.0 - smoothstep(0.0, 36.0, s)) * step(0.0, s) * (0.55 + 0.45*vn(vec2(s*0.12, vLoc.z/18.0)));
        col = mix(col, vec3(0.92,0.96,0.94), foam);
        diffuseColor.rgb = col;
        diffuseColor.a *= 1.0 - smoothstep(0.72, 1.0, length(vLoc.xz) / rmax);`,
      )
  }
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'pad-terrain'
  mesh.receiveShadow = true
  return mesh
}

export interface SkyRig {
  group: THREE.Group
  update(opts: { camera: THREE.Vector3; upInScene: THREE.Vector3; sunInScene: THREE.Vector3; altitudeM: number; worldQuat: THREE.Quaternion }): void
}

export function buildSky(): SkyRig {
  const group = new THREE.Group()
  group.name = 'sky'
  const u = {
    sun: { value: new THREE.Vector3(1, 0, 0) },
    up: { value: new THREE.Vector3(0, 1, 0) },
    atmo: { value: 1 },
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1e8, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: u,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 sun; uniform vec3 up; uniform float atmo; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = dot(d, up);
          float sunUp = dot(normalize(sun), up);
          float day = smoothstep(-0.12, 0.3, sunUp) * atmo;
          float twi = (1.0 - smoothstep(0.0, 0.35, abs(sunUp + 0.02))) * atmo;
          vec3 zenith = mix(vec3(0.0), vec3(0.09,0.22,0.46), day);
          vec3 horizon = mix(vec3(0.0), vec3(0.93,0.74,0.56), day);
          vec3 c = mix(horizon, zenith, smoothstep(0.0, 0.55, h));
          c = mix(c, vec3(0.65,0.62,0.74) * day, smoothstep(0.15, -0.05, h) * 0.2);
          c += vec3(1.0,0.45,0.2) * twi * 0.28 * pow(max(dot(d, normalize(sun)), 0.0), 3.0) * atmo;
          float s = max(dot(d, normalize(sun)), 0.0);
          c += vec3(1.0,0.82,0.55) * (pow(s, 8.0) * 0.28 + pow(s, 420.0) * 3.0);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  )
  dome.renderOrder = -20
  group.add(dome)

  const n = 2600
  const p = new Float32Array(n * 3)
  const c = new Float32Array(n * 3)
  const q = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    q.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
    if (q.lengthSq() > 1 || q.lengthSq() < 0.01) {
      i--
      continue
    }
    q.normalize().multiplyScalar(9e7)
    p.set([q.x, q.y, q.z], i * 3)
    const b = 0.45 + Math.random() * 0.55
    c.set([b, b, b * (0.85 + Math.random() * 0.15)], i * 3)
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(p, 3))
  sg.setAttribute('color', new THREE.BufferAttribute(c, 3))
  const sm = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, depthTest: false })
  const stars = new THREE.Points(sg, sm)
  stars.renderOrder = -19
  const starGroup = new THREE.Group()
  starGroup.add(stars)
  group.add(starGroup)

  return {
    group,
    update({ camera, upInScene, sunInScene, altitudeM, worldQuat }) {
      group.position.copy(camera)
      u.sun.value.copy(sunInScene)
      u.up.value.copy(upInScene)
      const atmo = Math.exp(-Math.max(0, altitudeM) / 16000)
      u.atmo.value = atmo
      sm.opacity = 1 - 0.97 * Math.min(1, atmo * Math.max(0, Math.min(1, (upInScene.dot(sunInScene) + 0.1) / 0.35)))
      starGroup.quaternion.copy(worldQuat)
    },
  }
}
