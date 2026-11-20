import { flight } from '../flight'
import { add, scale, timeAt, unit, type State } from './frame'
import { keplerFrom } from './orbit'
import { shipAt } from './ship'

const start = timeAt('payload_deploy_start')
const end = timeAt('payload_deploy_complete')
const count = flight.mission.payload.count.value
const span = flight.model.satellites.delta_v_span_ms.value

const releases = Array.from({ length: count }, (_, n) => {
  const fraction = n / (count - 1)
  const time = start + fraction * (end - start)
  const { r, v } = shipAt(time)
  const separatedV = add(v, scale(unit(v), span * (fraction - 0.5)))
  return { id: n + 1, time, at: keplerFrom({ r, v: separatedV }, time) }
})

export function satellitesAt(time: number): (State & { id: number })[] {
  return releases.filter(release => release.time <= time)
    .map(release => ({ id: release.id, ...release.at(time) }))
}
