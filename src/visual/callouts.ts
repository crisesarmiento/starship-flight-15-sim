import { eventTime } from './core'

export interface Callout {
  text: string
  kind: 'info' | 'fts' | 'catch'
}

const T = {
  boosterLanding: eventTime('booster_landing_burn_start'),
  fts: eventTime('booster_fts'),
  subsonic: eventTime('subsonic'),
  shipLanding: eventTime('ship_landing_burn_start'),
  flip: eventTime('landing_flip'),
  threeToTwo: eventTime('landing_3_to_2'),
  catch: eventTime('ship_catch'),
}

/** Short on-screen notes for the moments the spec asks to see: hover, FTS, swoosh, flip, 3-2-1, catch. */
export function calloutsAt(t: number): Callout[] {
  const out: Callout[] = []
  if (t >= T.boosterLanding && t < T.fts) out.push({ text: 'Booster: quema de aterrizaje y hover sobre el Golfo', kind: 'info' })
  if (t >= T.fts && t < T.fts + 40) out.push({ text: 'FTS del booster: no hubo catch', kind: 'fts' })
  if (t >= T.subsonic && t < T.shipLanding) out.push({ text: 'Ship: swoosh sobre el Golfo (ventana aprox.)', kind: 'info' })
  if (t >= T.flip && t < T.threeToTwo) out.push({ text: 'Ship: flip de aterrizaje', kind: 'info' })
  if (t >= T.threeToTwo && t < T.catch) out.push({ text: 'Ship: quema 3 → 2 → 1 motores', kind: 'info' })
  if (t >= T.catch) out.push({ text: 'Ship atrapada por los brazos en Pad 2', kind: 'catch' })
  return out
}
