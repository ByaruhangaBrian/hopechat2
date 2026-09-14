/**
 * CSV helpers for bulk-importing test questions.
 *
 * Expected CSV format (header row required):
 *   question,option_a,option_b,option_c,option_d,correct_option,points
 *
 * - `option_*` columns are flexible: any number of option columns are supported.
 * - `correct_option` is the letter of the correct answer (A, B, C …) or blank.
 * - `points` defaults to 1.
 * - Rows with an empty question are skipped.
 */

const CSV_HEADER_PATTERN =
  /^question\s*,\s*option[_\s]?a\s*,/i;

function splitCsvLine(line: string): string[] {
  // Simple CSV splitter that handles quoted fields.
  const cells: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuote = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuote = true
      } else if (ch === ',') {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  cells.push(current.trim())
  return cells
}

export interface ParsedQuestion {
  question: string
  options: Array<{ key: string; label: string }>
  correct_answer: string | null
  points: number
}

export function parseImportCsv(csv: string): ParsedQuestion[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Detect header row — if it matches the expected pattern, skip it.
  const headerLine = lines[0]
  const hasHeader = CSV_HEADER_PATTERN.test(headerLine)
  const dataLines = hasHeader ? lines.slice(1) : lines

  const results: ParsedQuestion[] = []

  for (const line of dataLines) {
    const cells = splitCsvLine(line)
    const [questionRaw, ...rest] = cells
    const question = questionRaw.replace(/^["']|["']$/g, '').trim()
    if (!question) continue

    // Last cell is points (numeric), second-last is correct_option (letter).
    const optionCells = rest.slice(0, -2)
    const correctLetter = (rest[rest.length - 2] || '').trim().toUpperCase()
    const pointsRaw = parseInt(rest[rest.length - 1], 10)
    const points = Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1

    const options = optionCells
      .map((cell, i) => {
        const label = cell.replace(/^["']|["']$/g, '').trim()
        if (!label) return null
        return { key: String.fromCharCode(65 + i), label }
      })
      .filter((o): o is { key: string; label: string } => !!o)

    const correctKey =
      correctLetter.length === 1 && correctLetter >= 'A' && correctLetter <= String.fromCharCode(64 + options.length)
        ? correctLetter
        : null

    results.push({ question, options, correct_answer: correctKey, points })
  }

  return results
}

export function generateCsvTemplate(): string {
  const rows = [
    'question,option_a,option_b,option_c,option_d,correct_option,points',
    '"What is 2 + 2?","1","2","4","6","C","1"',
    '"Capital of France?","London","Paris","Berlin","Rome","B","1"',
    '"Which planet is closest to the Sun?","Venus","Earth","Mercury","Mars","C","1"',
  ]
  return rows.join('\n')
}
