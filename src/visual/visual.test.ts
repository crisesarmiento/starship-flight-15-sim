import { describe, expect, it } from 'vitest'
import { runVisualChecks } from './check'

describe('escena y UI: cotas, recorrido y honestidad del HUD', () => {
  for (const r of runVisualChecks()) {
    it(r.name, () => {
      expect(r.ok, r.detail).toBe(true)
    })
  }
})
