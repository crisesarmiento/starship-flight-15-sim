import { expect, it } from 'vitest'
import { flight } from './flight'

it('provides official dimensions and specifies three grid fins for Super Heavy V3', () => {
  const { stack, booster, ship } = flight.vehicle
  for (const [stage, height] of [[stack, 124], [booster, 72], [ship, 52]] as const) {
    expect(stage.height_m).toMatchObject({ value: height, unit: 'm', confidence: 'official' })
    expect(stage.diameter_m).toMatchObject({ value: 9, unit: 'm', confidence: 'official' })
  }
  expect(stack.height_m.value).toBe(booster.height_m.value + ship.height_m.value)
  expect(booster.grid_fins).toMatchObject({ value: 3, confidence: 'official' })
})
