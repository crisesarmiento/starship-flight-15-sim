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
  if (t >= T.boosterLanding && t < T.fts) out.push({ text: 'Booster: landing burn and hover over the Gulf', kind: 'info' })
  if (t >= T.fts && t < T.fts + 40) out.push({ text: 'Booster FTS: no catch', kind: 'fts' })
  if (t >= T.subsonic && t < T.shipLanding) out.push({ text: 'Ship: swoosh over the Gulf (approx. window)', kind: 'info' })
  if (t >= T.flip && t < T.threeToTwo) out.push({ text: 'Ship: landing flip', kind: 'info' })
  if (t >= T.threeToTwo && t < T.catch) out.push({ text: 'Ship: 3 → 2 → 1 engine burn', kind: 'info' })
  if (t >= T.catch) out.push({ text: 'Ship caught by the arms at Pad 2', kind: 'catch' })
  return out
}
