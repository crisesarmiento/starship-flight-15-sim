import rawFlight from '../data/flight15.json'

type KnownConfidence = 'official' | 'reported' | 'estimate'
type Confidence = KnownConfidence | 'unknown'

type Datum<T> = T extends null
  ? { readonly value: null; readonly confidence: 'unknown'; readonly source: 'no publicado' }
  : { readonly value: T; readonly confidence: KnownConfidence; readonly source: string }

type TypedData<T> = T extends { value: infer Value }
  ? Datum<Value extends unknown[] ? Readonly<Value> : Value>
      & { readonly note?: string }
      & (T extends { unit: string } ? { readonly unit: string } : unknown)
  : T extends object
    ? { readonly [Key in keyof T]: TypedData<T[Key]> }
    : T

export type TimelineEvent = {
  readonly id: string
  readonly t_sec: number
  readonly t_unit: 's'
  readonly label: string
  readonly vehicle: 'stack' | 'booster' | 'ship'
  readonly confidence: KnownConfidence
  readonly source: string
  readonly as_flown_note: string | null
  readonly altitude_m?: Datum<number | null> & { readonly unit: 'm'; readonly note?: string }
}

type Flight = TypedData<Omit<typeof rawFlight, 'timeline'>> & {
  readonly timeline: readonly [TimelineEvent, ...TimelineEvent[]]
}

const confidences: readonly Confidence[] = ['official', 'reported', 'estimate', 'unknown']

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSourceUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\/\S+$/.test(value)
}

function checkMetadata(node: unknown, path: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkMetadata(item, `${path}[${i}]`))
    return
  }
  if (node === null || typeof node !== 'object') {
    if (typeof node === 'number') throw new Error(`${path}: magnitud sin metadatos`)
    return
  }
  const fields = node as Record<string, unknown>
  if ('confidence' in fields && !confidences.some(confidence => confidence === fields.confidence)) {
    throw new Error(`${path}: confianza inválida`)
  }
  if ('value' in fields) {
    const { value, unit, confidence, source } = fields
    if (confidence === 'unknown') {
      if (value !== null || source !== 'no publicado') {
        throw new Error(`${path}: un dato desconocido debe quedar null y sin fuente publicada`)
      }
    } else if (value === null || !confidence || !isSourceUrl(source)) {
      throw new Error(`${path}: falta valor, confianza o fuente`)
    }
    const numbers = typeof value === 'number' ? [value] : Array.isArray(value) ? value : undefined
    if (numbers && (!hasText(unit) || !numbers.every(Number.isFinite))) {
      throw new Error(`${path}: magnitud inválida o sin unidad`)
    }
    return
  }
  if ('confidence' in fields && (!isSourceUrl(fields.source) || fields.confidence === 'unknown')) {
    throw new Error(`${path}: fuente inválida`)
  }
  for (const [key, value] of Object.entries(fields)) {
    if (key !== 't_sec') checkMetadata(value, `${path}.${key}`)
  }
}

function validateFlight(data: typeof rawFlight): asserts data is typeof rawFlight & Flight {
  checkMetadata(data, 'flight')
  const ids = new Set<string>()
  let previous = -1
  for (const event of data.timeline) {
    if (!hasText(event.id) || ids.has(event.id) || !hasText(event.label)
        || !Number.isSafeInteger(event.t_sec) || event.t_sec < 0 || event.t_sec < previous
        || event.t_unit !== 's' || !isSourceUrl(event.source)
        || !['official', 'reported', 'estimate'].includes(event.confidence)
        || (event.as_flown_note !== null && !hasText(event.as_flown_note))
        || !['stack', 'booster', 'ship'].includes(event.vehicle)) {
      throw new Error(`Timeline inválida cerca de ${event.id}`)
    }
    if ('altitude_m' in event && event.altitude_m?.unit !== 'm') {
      throw new Error(`Unidad de altitud inválida en ${event.id}`)
    }
    ids.add(event.id)
    previous = event.t_sec
  }
  if (data.timeline[0]?.id !== 'liftoff' || data.timeline[0].t_sec !== 0) {
    throw new Error('La timeline debe empezar en el despegue (T+0)')
  }
}

validateFlight(rawFlight)
export const flight: Flight = rawFlight
