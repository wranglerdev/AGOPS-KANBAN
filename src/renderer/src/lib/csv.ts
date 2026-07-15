/**
 * Utilitario CSV minimalista (zero dependencias).
 * Lida com aspas, aspas escapadas (""), virgulas e quebras de linha dentro de campos.
 */

const NEEDS_QUOTE = /[",\r\n]/

function escapeField(value: string): string {
  if (NEEDS_QUOTE.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/**
 * Serializa linhas em CSV. Usa \r\n como separador (compativel com Excel).
 * `headers` define a ordem/colunas; se omitido, usa as chaves da primeira linha.
 */
export function toCSV(rows: Record<string, string>[], headers?: string[]): string {
  const cols = headers ?? (rows.length > 0 ? Object.keys(rows[0]) : [])
  const lines = [cols.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(cols.map((c) => escapeField(row[c] ?? '')).join(','))
  }
  return lines.join('\r\n')
}

/**
 * Parser em maquina de estados: respeita aspas, "" escapado, virgulas e
 * quebras de linha dentro de campos entre aspas. Remove BOM inicial.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  let src = text
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)

  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  let i = 0

  const endField = (): void => {
    record.push(field)
    field = ''
  }
  const endRecord = (): void => {
    endField()
    records.push(record)
    record = []
  }

  while (i < src.length) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      endField()
      i++
      continue
    }
    if (ch === '\r') {
      // Absorve \r\n ou \r isolado como fim de registro.
      endRecord()
      if (src[i + 1] === '\n') i += 2
      else i++
      continue
    }
    if (ch === '\n') {
      endRecord()
      i++
      continue
    }
    field += ch
    i++
  }
  // Ultimo campo/registro pendente (se o arquivo nao termina com newline).
  if (field.length > 0 || record.length > 0) endRecord()

  // Remove linhas totalmente vazias (ex.: newline final).
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ''))
  const headers = nonEmpty.length > 0 ? nonEmpty[0] : []
  return { headers, rows: nonEmpty.slice(1) }
}
