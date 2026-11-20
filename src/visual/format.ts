const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/** T+hh:mm:ss */
export function fmtT(t: number): string {
  const s = Math.max(0, Math.round(t))
  return `T+${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}

const cordobaDate = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Cordoba',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const cordobaTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Cordoba',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** Wall clock in Córdoba (UTC-3) for a mission time, from the reported liftoff instant. */
export function cordobaClock(liftoffUtc: string | null, t: number): { date: string; time: string } | null {
  if (!liftoffUtc) return null
  const base = Date.parse(liftoffUtc)
  if (!Number.isFinite(base)) return null
  const d = new Date(base + t * 1000)
  return { date: cordobaDate.format(d).replace('.', ''), time: cordobaTime.format(d) }
}

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
const ni = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export function fmtAltitude(m: number | null): string {
  if (m === null) return '—'
  return Math.abs(m) >= 10_000 ? `${nf.format(m / 1000)} km` : `${ni.format(m)} m`
}

export function fmtSpeed(ms: number | null): string {
  if (ms === null) return '—'
  return `${ni.format(ms)} m/s`
}

export function fmtDistance(m: number | null): string {
  if (m === null) return '—'
  return Math.abs(m) >= 10_000 ? `${nf.format(m / 1000)} km` : `${ni.format(m)} m`
}
