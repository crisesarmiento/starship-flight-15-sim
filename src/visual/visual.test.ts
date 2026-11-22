import { describe, expect, it } from 'vitest'
import { runVisualChecks } from './check'

describe('scene and UI: dimensions, mission playback, and HUD data provenance', () => {
  for (const r of runVisualChecks()) {
    it(r.name, () => {
      expect(r.ok, r.detail).toBe(true)
    })
  }
})
