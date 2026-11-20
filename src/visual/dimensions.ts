import type { flight } from './core'

/** Measured values: always read from data/flight15.json (official ones). */
export interface Measured {
  diameter: number
  boosterHeight: number
  shipHeight: number
  stackHeight: number
  boosterEngines: number
  boosterCenter: number
  boosterPerimeter: number
  boosterGridFins: number
  shipSeaLevel: number
  shipVacuum: number
  padLat: number
  padLon: number
}

export function measuredFrom(f: typeof flight): Measured {
  const v = f.vehicle
  return {
    diameter: v.stack.diameter_m.value,
    boosterHeight: v.booster.height_m.value,
    shipHeight: v.ship.height_m.value,
    stackHeight: v.stack.height_m.value,
    boosterEngines: v.booster.engine_count.value,
    boosterCenter: v.booster.center_maneuverable_engines.value,
    boosterPerimeter: v.booster.perimeter_engines.value,
    boosterGridFins: v.booster.grid_fins.value,
    shipSeaLevel: v.ship.sea_level_engines.value,
    shipVacuum: v.ship.vacuum_engines.value,
    padLat: f.site.latitude_deg.value,
    padLon: f.site.longitude_deg.value,
  }
}

/**
 * Purely visual choices. NOT published numbers: they only shape how the model looks.
 * None of these is shown in the UI as a fact.
 */
export const VISUAL = {
  /** Raptor size is official (1.3 m x 2.9 m); the exact engine layout is schematic. */
  raptorDiameter: 1.3,
  raptorHeight: 2.9,
  /** Bell exit radii used to place engines without overlap (schematic layout). */
  bellRadius: 0.58,
  vacBellRadius: 1.1,
  shipNoseLength: 17,
  towerHeight: 145,
  towerSide: 11,
  mountHeight: 20,
  /** Where the Gulf starts east of the pad, schematic. */
  coastEastM: 2600,
} as const

/** Engine rings for the booster: 3 centre + 10 middle (13 maneuverable) + 20 outer. */
export function boosterEngineLayout(m: Measured): { x: number; z: number; ring: 'center' | 'middle' | 'outer' }[] {
  const out: { x: number; z: number; ring: 'center' | 'middle' | 'outer' }[] = []
  const centerCount = 3
  const middleCount = m.boosterCenter - centerCount
  const outerCount = m.boosterPerimeter
  for (let i = 0; i < centerCount; i++) {
    const a = (i / centerCount) * Math.PI * 2 + Math.PI / 2
    out.push({ x: Math.cos(a) * 0.85, z: Math.sin(a) * 0.85, ring: 'center' })
  }
  for (let i = 0; i < middleCount; i++) {
    const a = (i / middleCount) * Math.PI * 2
    out.push({ x: Math.cos(a) * 2.3, z: Math.sin(a) * 2.3, ring: 'middle' })
  }
  for (let i = 0; i < outerCount; i++) {
    const a = ((i + 0.5) / outerCount) * Math.PI * 2
    out.push({ x: Math.cos(a) * 3.75, z: Math.sin(a) * 3.75, ring: 'outer' })
  }
  return out
}

/** Ship: sea-level engines first (the ones used for 3-2-1 landing), vacuum ones after. */
export function shipEngineLayout(m: Measured): { x: number; z: number; kind: 'sl' | 'vac' }[] {
  const out: { x: number; z: number; kind: 'sl' | 'vac' }[] = []
  for (let i = 0; i < m.shipSeaLevel; i++) {
    const a = (i / m.shipSeaLevel) * Math.PI * 2 + Math.PI / 2
    out.push({ x: Math.cos(a) * 1.3, z: Math.sin(a) * 1.3, kind: 'sl' })
  }
  for (let i = 0; i < m.shipVacuum; i++) {
    const a = (i / m.shipVacuum) * Math.PI * 2 + Math.PI / 2 + Math.PI / m.shipVacuum
    out.push({ x: Math.cos(a) * 2.95, z: Math.sin(a) * 2.95, kind: 'vac' })
  }
  return out
}
