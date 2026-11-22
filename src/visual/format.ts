const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/** T+hh:mm:ss */
export function fmtT(t: number): string {
  const s = Math.max(0, Math.round(t))
  return `T+${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}

const cordobaDate = new Intl.DateTimeFormat('en-US', {
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
  if (Math.abs(m) < 0.5) return '0 m'
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

const n2 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const n3 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Altitude above the surface in km, signed (a negative perigee means below the ground). */
export function fmtKm(m: number | null): string {
  if (m === null || !Number.isFinite(m)) return '—'
  return `${nf.format(m / 1000)} km`
}

export function fmtG(g: number | null): string {
  return g === null || !Number.isFinite(g) ? '—' : `${n2.format(g)} g`
}

export function fmtMassT(kg: number | null): string {
  return kg === null || !Number.isFinite(kg) ? '—' : `${ni.format(kg / 1000)} t`
}

export function fmtDeg(d: number | null, digits = 2): string {
  if (d === null || !Number.isFinite(d)) return '—'
  return `${new Intl.NumberFormat('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(d)}°`
}

/** Latitude/longitude with hemisphere letters (N, S, E, W). */
export function fmtLat(d: number): string {
  return `${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Math.abs(d))}° ${d >= 0 ? 'N' : 'S'}`
}
export function fmtLon(d: number): string {
  return `${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Math.abs(d))}° ${d >= 0 ? 'E' : 'W'}`
}

export function fmtPeriod(s: number | null): string {
  return s === null || !Number.isFinite(s) ? '—' : `${nf.format(s / 60)} min`
}

export function fmtEcc(e: number | null): string {
  return e === null || !Number.isFinite(e) ? '—' : n3.format(e)
}

export function fmtDv(v: number | null): string {
  return v === null || !Number.isFinite(v) ? '—' : `${ni.format(v)} m/s`
}

export function fmtDuration(s: number): string {
  return s >= 90 ? `${nf.format(s / 60)} min` : `${ni.format(s)} s`
}
