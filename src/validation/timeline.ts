import { sample } from '../core'

export type Sample = ReturnType<typeof sample>
type Value = string | number
type Selector = Value | ((value: Value) => boolean)

export type Probe = {
  label: string
  read: (state: Sample) => Value
  to: Selector
  from?: Selector
}

const event = (id: string): Probe => ({ label: 'Evento', read: state => state.event.id, to: id })
const engines = (vehicle: 'booster' | 'ship', from: Selector, to: Selector): Probe => ({
  label: vehicle === 'booster' ? 'Motores Booster' : 'Motores Ship',
  read: state => vehicle === 'booster' ? state.boosterEngines : state.shipEngines,
  from,
  to,
})
const satellites = (from: number, to: number): Probe => ({
  label: 'Satélites',
  read: state => state.satellites.length,
  from,
  to,
})
const status = (vehicle: 'booster' | 'ship', to: string): Probe => ({
  label: `Estado ${vehicle}`,
  read: state => state[vehicle].status,
  to,
})
const lit = (n: Value) => typeof n === 'number' && Number.isInteger(n) && n > 0
const mostOff = (n: Value) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 33 / 2

type Reference = {
  id: string
  time: number
  tolerance: number
  probes: Probe[]
  marker: Probe | null
}

function reference(id: string, hms: string, tolerance: number, ...probes: Probe[]): Reference {
  const [hours, minutes, seconds] = hms.split(':').map(Number)
  return {
    id, time: hours * 3600 + minutes * 60 + seconds, tolerance, probes,
    // When the cutoff and FTS share a timestamp, the event field shows FTS:
    // the independent evidence for the cutoff is the booster engine count.
    marker: id === 'booster_landing_burn_shutdown' ? null : event(id),
  }
}

// Manually transcribed from research.md §3 / SPEC.md §2, §8. Not derived
// from the input timeline or from any core constants.
export const references = [
  reference('liftoff', '00:00:00', 2, engines('booster', 0, 33)),
  reference('max_q', '00:00:58', 2),
  reference('meco', '00:02:19', 2, engines('booster', 33, mostOff)),
  reference('hot_staging', '00:02:21', 2, engines('ship', 0, 6)),
  reference('boostback_start', '00:02:26', 2, engines('booster', mostOff, 32)),
  reference('boostback_shutdown', '00:03:02', 2, engines('booster', 32, 0)),
  reference('booster_landing_burn_start', '00:06:10', 2, engines('booster', 0, 13)),
  reference('booster_landing_burn_shutdown', '00:06:35', 2, engines('booster', lit, 0)),
  reference('booster_fts', '00:06:35', 2, status('booster', 'fts')),
  reference('ship_ascent_cutoff', '00:08:09', 2, engines('ship', 6, 0)),
  reference('insertion_start', '00:26:10', 5, engines('ship', 0, 1)),
  reference('insertion_shutdown', '00:26:30', 5, engines('ship', 1, 0)),
  reference('payload_deploy_start', '00:35:01', 5, satellites(0, 1)),
  reference('payload_deploy_complete', '01:17:40', 5, satellites(25, 26)),
  reference('hawaii_check_early', '01:27:46', 15),
  reference('chile_check', '07:15:35', 15),
  reference('hawaii_check_final', '20:41:55', 15),
  reference('deorbit_start', '21:35:57', 15, engines('ship', 0, 1)),
  reference('deorbit_shutdown', '21:36:07', 15, engines('ship', 1, 0)),
  reference('entry', '22:10:46', 5),
  reference('transonic', '22:29:34', 5),
  reference('subsonic', '22:30:13', 5),
  reference('ship_landing_burn_start', '22:32:16', 5, engines('ship', 0, 3)),
  reference('landing_flip', '22:32:18', 5),
  reference('landing_3_to_2', '22:32:26', 5, engines('ship', 3, 2)),
  reference('landing_2_to_1', '22:32:33', 5, engines('ship', 2, 1)),
  reference('ship_catch', '22:32:34', 5, status('ship', 'caught'), engines('ship', 1, 0)),
] as const

export type Transition = { time: number; before: Value | null; after: Value }
type Evidence = { label: string; transitions: Transition[] }

const scanStepS = 0.25
const refineSteps = 18
const matches = (value: Value, target: Selector) =>
  typeof target === 'function' ? target(value) : value === target

function measure(ref: Reference, probe: Probe): Evidence {
  const transitions: Transition[] = []
  // Search past the allowed band so near misses are visible in the report.
  const from = Math.max(0, ref.time - ref.tolerance - 2)
  const to = ref.time + ref.tolerance + 2
  const first = sample(from)
  let previous = probe.read(first)
  if (from === 0 && matches(previous, probe.to)) {
    transitions.push({ time: first.time, before: null, after: previous })
  }
  for (let t = from + scanStepS; t <= to; t += scanStepS) {
    const current = probe.read(sample(t))
    if (matches(current, probe.to) && !matches(previous, probe.to)) {
      let lo = t - scanStepS
      let hi = t
      for (let i = 0; i < refineSteps; i++) {
        const mid = (lo + hi) / 2
        if (matches(probe.read(sample(mid)), probe.to)) hi = mid
        else lo = mid
      }
      const before = probe.read(sample(lo))
      const after = sample(hi)
      if (probe.from === undefined || matches(before, probe.from)) {
        transitions.push({ time: after.time, before, after: probe.read(after) })
      }
    }
    previous = current
  }
  return { label: probe.label, transitions }
}

export function observeTimeline() {
  return references.map(ref => ({
    ...ref,
    clock: ref.marker ? measure(ref, ref.marker) : null,
    effects: ref.probes.map(probe => measure(ref, probe)),
  }))
}

export type TimelineRow = ReturnType<typeof observeTimeline>[number]

export function observedTime(row: TimelineRow | undefined): number | null {
  const evidence = row?.effects[0] ?? row?.clock
  return evidence?.transitions.length === 1 ? evidence.transitions[0].time : null
}
