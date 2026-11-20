/**
 * The mission lasts ~22 h but the first 8 minutes hold most of the events.
 * The scrubber uses a compressed scale: every gap between events gets a share
 * proportional to gap^0.38, so short gaps stay clickable and long ones don't swallow the bar.
 */
export interface TimeScale {
  toPos(t: number): number
  toTime(pos: number): number
}

export function buildTimeScale(eventTimes: number[], duration: number): TimeScale {
  const knots = [0, ...eventTimes, duration].sort((a, b) => a - b)
  const uniq = knots.filter((v, i) => i === 0 || v > knots[i - 1])
  const weights: number[] = []
  for (let i = 0; i < uniq.length - 1; i++) weights.push(Math.pow(Math.max(uniq[i + 1] - uniq[i], 1), 0.38))
  const total = weights.reduce((a, b) => a + b, 0)
  const pos: number[] = [0]
  for (const w of weights) pos.push(pos[pos.length - 1] + w / total)

  const find = (arr: number[], v: number) => {
    let lo = 0
    let hi = arr.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (arr[mid] <= v) lo = mid
      else hi = mid
    }
    return lo
  }
  return {
    toPos(t) {
      if (t <= uniq[0]) return 0
      if (t >= uniq[uniq.length - 1]) return 1
      const i = find(uniq, t)
      return pos[i] + ((t - uniq[i]) / (uniq[i + 1] - uniq[i])) * (pos[i + 1] - pos[i])
    },
    toTime(p) {
      if (p <= 0) return uniq[0]
      if (p >= 1) return uniq[uniq.length - 1]
      const i = find(pos, p)
      return uniq[i] + ((p - pos[i]) / (pos[i + 1] - pos[i])) * (uniq[i + 1] - uniq[i])
    },
  }
}
