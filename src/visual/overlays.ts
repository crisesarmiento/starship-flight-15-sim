import * as THREE from 'three'
import { orbitPath, frameAt, entryHandoff, type Sample } from './core'
import { eciToEcef, geodeticToScene, toScene } from './frames'
import { DynLine } from './lines'
import { fmtKm } from './format'

export type LabelKind = 'pad' | 'event' | 'fts' | 'catch' | 'dim' | 'sat' | 'apsis' | 'burn' | 'ghost'

export interface Anchor {
  id: string
  text: string
  /** Position in the inertial group (metres). */
  pos: THREE.Vector3
  kind: LabelKind
  align?: 'top' | 'right'
  dim?: boolean
  /** Position is Earth-fixed (inside the rotating Earth group), not inertial. */
  fixed?: boolean
}

export interface OverlayTimes {
  fts: number
  entry: number
  deorbitShutdown: number
  insertionStart: number
  hotStaging: number
  /** Instant where the core cuts position and velocity (entry). */
  entryCut: number
}

export interface OverlayContext {
  t: number
  s: Sample
  /** Visual scale applied to vehicles. */
  scale: number
  camDist: number
  wall: number
  orbit: boolean
  track: boolean
  trails: boolean
}

const CAP = 640

export class Overlays {
  /** Inertial: does not turn with the Earth. */
  readonly inertial = new THREE.Group()
  /** Earth-fixed: add inside the Earth group. */
  readonly fixed = new THREE.Group()
  readonly satellites: THREE.InstancedMesh
  readonly fireball: THREE.Sprite
  private readonly debris: THREE.Points
  private readonly ship = new DynLine(CAP, 0xc9a9ff, 2.4)
  private readonly boosterArc = new DynLine(CAP, 0x7fd0ff, 1.6, 0.6)
  private readonly track = new DynLine(CAP, 0x4be39a, 1.8, 0.9)
  private readonly trackPost = new DynLine(CAP, 0x4be39a, 1.8, 0.9)
  private readonly trailShip = new DynLine(CAP, 0xffe0a8, 2.2)
  private readonly trailShipPost = new DynLine(CAP, 0xffe0a8, 2.2)
  private readonly trailBooster = new DynLine(CAP, 0x7fd0ff, 2.2)
  private readonly perigee: THREE.Mesh
  private readonly apogee: THREE.Mesh
  private readonly ftsRing: THREE.Mesh
  // Each layer has its own mark (last mission time and last wall time) and its own on/off memory,
  // so a pause costs nothing and a toggle forces one fresh build.
  private trailsOn = false
  private trailsT = Number.NaN
  private trailsWall = -1e9
  private trackOn = false
  private trackT = Number.NaN
  private trackWall = -1e9
  private orbitOn = false
  private orbitT = Number.NaN
  private orbitAnchors: Anchor[] = []
  /** How many times each layer was rebuilt (for the pause check). */
  readonly rebuilds = { trails: 0, track: 0, orbit: 0 }
  /** Last time ranges drawn per layer (Ship only); a range never spans the entry cut. */
  readonly ranges = { trails: [] as [number, number][], track: [] as [number, number][] }
  private readonly buf = new Float32Array(CAP * 3)
  private readonly tmp = new THREE.Vector3()
  private readonly dummy = new THREE.Object3D()

  constructor(private readonly R: number, private readonly T: OverlayTimes, satelliteCount: number) {
    this.inertial.name = 'overlays-inertial'
    this.fixed.name = 'overlays-fixed'
    this.inertial.add(this.ship.line, this.boosterArc.line)
    this.fixed.add(this.track.line, this.trackPost.line, this.trailShip.line, this.trailShipPost.line, this.trailBooster.line)

    const mk = (color: number) => new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 }))
    this.perigee = mk(0xff7a2f)
    this.apogee = mk(0x7fd0ff)
    for (const m of [this.perigee, this.apogee]) {
      m.renderOrder = 8
      m.visible = false
      this.inertial.add(m)
    }

    // 26 satellites: schematic flat panels (size is a visual choice, not a published dimension)
    this.satellites = new THREE.InstancedMesh(
      new THREE.BoxGeometry(9, 0.35, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xe9eef0, metalness: 0.6, roughness: 0.35, emissive: 0x223038 }),
      Math.max(1, satelliteCount),
    )
    this.satellites.count = 0
    this.satellites.frustumCulled = false
    this.inertial.add(this.satellites)

    const glow = glowTexture()
    this.fireball = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff5a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
    this.fireball.visible = false
    this.fireball.renderOrder = 7
    this.inertial.add(this.fireball)

    const dp = new Float32Array(90 * 3)
    for (let i = 0; i < 90; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(0.4 + Math.random())
      dp.set([v.x, v.y, v.z], i * 3)
    }
    const dg = new THREE.BufferGeometry()
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3))
    this.debris = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffa060, size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }))
    this.debris.visible = false
    this.inertial.add(this.debris)

    this.ftsRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff4a3d, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false }))
    this.ftsRing.visible = false
    this.ftsRing.renderOrder = 7
    this.inertial.add(this.ftsRing)
  }

  setResolution(w: number, h: number): void {
    for (const l of [this.ship, this.boosterArc, this.track, this.trackPost, this.trailShip, this.trailShipPost, this.trailBooster]) l.setResolution(w, h)
  }

  private flat(points: readonly (readonly [number, number, number])[]): number {
    const n = Math.min(points.length, this.buf.length / 3)
    const step = points.length > n ? (points.length - 1) / (n - 1) : 1
    for (let i = 0; i < n; i++) {
      const p = points[Math.min(points.length - 1, Math.round(i * step))]
      toScene(p, this.tmp)
      this.buf[i * 3] = this.tmp.x
      this.buf[i * 3 + 1] = this.tmp.y
      this.buf[i * 3 + 2] = this.tmp.z
    }
    return n
  }

  update(c: OverlayContext): Anchor[] {
    const out: Anchor[] = []
    const { s } = c
    const marker = Math.max(2.5, c.camDist * 0.006)

    // ---- live osculating orbit of the Ship, computed by the core from (r, v). Rebuilt when time moves or the layer is switched on.
    if (c.orbit) {
      if (!this.orbitOn || c.t !== this.orbitT) {
        this.orbitOn = true
        this.orbitT = c.t
        this.rebuilds.orbit++
        this.orbitAnchors = []
        const path = orbitPath(s.ship.r, s.ship.v)
        this.ship.set(this.buf, this.flat(path.points))
        const apsis = (mesh: THREE.Mesh, p: readonly [number, number, number] | null, text: string, id: string) => {
          if (!p) {
            mesh.visible = false
            return
          }
          toScene(p, mesh.position)
          mesh.visible = true
          this.orbitAnchors.push({ id, text, pos: mesh.position.clone(), kind: 'apsis' })
        }
        apsis(this.perigee, path.perigee, `Perigee ${fmtKm(s.orbit.perigeeM)}`, 'perigee')
        apsis(this.apogee, path.apogee, `Apogee ${fmtKm(s.orbit.apogeeM)}`, 'apogee')
        if (s.booster.status !== 'fts' && s.booster.altitudeM > 1000) {
          const bp = orbitPath(s.booster.r, s.booster.v)
          this.boosterArc.set(this.buf, this.flat(bp.points))
        } else this.boosterArc.hide()
      }
      this.perigee.scale.setScalar(marker)
      this.apogee.scale.setScalar(marker)
      out.push(...this.orbitAnchors)
    } else {
      this.orbitOn = false
      this.ship.hide()
      this.boosterArc.hide()
      this.perigee.visible = false
      this.apogee.visible = false
    }

    // ---- satellites
    const sats = s.satellites
    this.satellites.count = sats.length
    for (let i = 0; i < sats.length; i++) {
      toScene(sats[i].r, this.tmp)
      this.dummy.position.copy(this.tmp)
      this.dummy.scale.setScalar(c.scale)
      this.dummy.rotation.set(0, i * 0.7, 0)
      this.dummy.updateMatrix()
      this.satellites.setMatrixAt(i, this.dummy.matrix)
      out.push({ id: `sat-${sats[i].id}`, text: String(sats[i].id), pos: this.tmp.clone(), kind: 'sat' })
    }
    this.satellites.instanceMatrix.needsUpdate = true

    // ---- flight termination of the booster: a fireball where the model puts it. Position is not published.
    if (s.booster.status === 'fts') {
      toScene(s.booster.r, this.tmp)
      const since = Math.max(0, c.t - this.T.fts)
      const base = Math.max(40, 55 * c.scale)
      this.fireball.position.copy(this.tmp)
      this.fireball.scale.setScalar(base * (1 + Math.min(since, 8) * 0.35))
      ;(this.fireball.material as THREE.SpriteMaterial).opacity = Math.max(0.25, 1 - since / 40)
      this.fireball.visible = true
      this.debris.visible = since < 45
      this.debris.position.copy(this.tmp)
      this.debris.scale.setScalar(base * (0.5 + Math.min(since, 30) * 0.22))
      this.ftsRing.position.copy(this.tmp)
      this.ftsRing.scale.setScalar(Math.max(marker * 2.2, base * 0.8))
      this.ftsRing.lookAt(this.tmp.clone().multiplyScalar(2))
      this.ftsRing.visible = true
      out.push({ id: 'fts', text: 'Booster FTS · position not published', pos: this.tmp.clone(), kind: 'fts' })
    } else {
      this.fireball.visible = false
      this.debris.visible = false
      this.ftsRing.visible = false
    }

    // ---- Earth-fixed trails and ground track. The core cuts position and velocity at the entry instant,
    // so no line ever joins a state before the cut with one after it: each side is its own segment.
    if (c.trails) {
      const stale = !this.trailsOn || (c.t !== this.trailsT && c.wall - this.trailsWall > 280)
      if (stale) {
        this.trailsOn = true
        this.trailsT = c.t
        this.trailsWall = c.wall
        this.rebuilds.trails++
        this.ranges.trails = []
        this.buildTrail([this.trailBooster, this.trailBooster], 0, Math.min(c.t, this.T.fts), 'booster', 140)
        const shipStart = c.t < this.T.insertionStart + 60 ? 0 : c.t >= this.T.deorbitShutdown ? this.T.deorbitShutdown : -1
        if (shipStart >= 0) this.buildTrail([this.trailShip, this.trailShipPost], shipStart, c.t, 'ship', 220)
        else {
          this.trailShip.hide()
          this.trailShipPost.hide()
        }
      }
    } else {
      this.trailsOn = false
      for (const l of [this.trailBooster, this.trailShip, this.trailShipPost]) l.hide()
    }
    if (c.track) {
      const stale = !this.trackOn || (c.t !== this.trackT && c.wall - this.trackWall > 350)
      if (stale) {
        this.trackOn = true
        this.trackT = c.t
        this.trackWall = c.wall
        this.rebuilds.track++
        this.ranges.track = []
        this.buildTrack([this.track, this.trackPost], Math.max(0, c.t - 6000), c.t)
      }
    } else {
      this.trackOn = false
      this.track.hide()
      this.trackPost.hide()
    }
    // the cut itself is marked, so the gap in the line is explained
    if ((c.trails || c.track) && c.t >= this.T.entryCut) {
      const theta = frameAt(this.T.entryCut).earthAngleRad
      const mark = (id: string, text: string, r: readonly [number, number, number]) =>
        out.push({ id, text, pos: eciToEcef(toScene(r), theta), kind: 'ghost', fixed: true })
      mark('cut-before', 'Entry cut · before', entryHandoff.before.r)
      mark('cut-after', `Entry cut · after (jump of ${Math.round(entryHandoff.distanceM / 1000).toLocaleString('en-US')} km)`, entryHandoff.after.r)
    }
    return out
  }

  /** Splits [t0, t1] at the entry cut: [before side, after side], each possibly absent. */
  private sides(t0: number, t1: number, who: 'ship' | 'booster'): [number, number][] {
    const cut = this.T.entryCut
    if (who === 'booster' || t1 < cut) return [[t0, t1]]
    if (t0 >= cut) return [[t0, t1]]
    return [[t0, cut - CUT_EPS], [cut, t1]]
  }

  /** Path relative to the ground: each sample is rotated back by its own Earth angle. */
  private buildTrail(lines: [DynLine, DynLine], t0: number, t1: number, who: 'ship' | 'booster', n: number): void {
    this.drawSides(lines, this.sides(t0, t1, who), n, (t) => {
      const q = frameAt(t)
      toScene(q[who].r, this.tmp)
      eciToEcef(this.tmp, q.earthAngleRad, this.tmp)
    }, who === 'ship' ? this.ranges.trails : [])
  }

  private buildTrack(lines: [DynLine, DynLine], t0: number, t1: number): void {
    this.drawSides(lines, this.sides(t0, t1, 'ship'), 140, (t) => {
      const q = frameAt(t).ship
      geodeticToScene(q.latitudeDeg, q.longitudeDeg, this.R + 2500, this.tmp)
    }, this.ranges.track)
  }

  private drawSides(lines: [DynLine, DynLine], segs: [number, number][], n: number, at: (t: number) => void, record: [number, number][]): void {
    const cut = this.T.entryCut
    lines[0].hide()
    if (lines[1] !== lines[0]) lines[1].hide()
    const total = segs.reduce((a, [x, y]) => a + (y - x), 0)
    segs.forEach(([a, b]) => {
      if (b - a < 1) return
      const count = Math.max(8, Math.round((n * (b - a)) / Math.max(total, 1)))
      let k = 0
      for (let j = 0; j < count; j++) {
        at(a + ((b - a) * j) / (count - 1))
        this.buf[k++] = this.tmp.x
        this.buf[k++] = this.tmp.y
        this.buf[k++] = this.tmp.z
      }
      // before the cut -> first line, after the cut (or a single segment after it) -> second line
      const line = a >= cut ? lines[1] : lines[0]
      line.set(this.buf, count)
      record.push([a, b])
    })
  }
}

const CUT_EPS = 1e-3

function glowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (!g) return null
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.3, 'rgba(255,255,255,0.5)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
