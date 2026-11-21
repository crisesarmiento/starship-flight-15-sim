import { writeFileSync } from 'node:fs'
import { env } from 'node:process'
import { URL } from 'node:url'

export function maybeWriteReport(markdown) {
  if (env.UPDATE_REPORT === '1') {
    writeFileSync(new URL('../../docs/VALIDACION.md', import.meta.url), markdown, 'utf8')
  }
}
