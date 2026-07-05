// Splits text into chunks for translation without ever breaking a line in half.
// Placeholders are already masked before this runs, so cutting between lines
// is always safe for plain/lua/renpy/csv style content.

export interface TextChunk {
  index: number
  text: string
  lineCount: number
}

const DEFAULT_MAX_CHARS = 3500

export function chunkByLines(text: string, maxChars: number = DEFAULT_MAX_CHARS): TextChunk[] {
  const lines = text.split('\n')
  const chunks: TextChunk[] = []
  let buffer: string[] = []
  let bufferLen = 0
  let index = 0

  for (const line of lines) {
    const lineLen = line.length + 1
    if (bufferLen + lineLen > maxChars && buffer.length > 0) {
      chunks.push({ index, text: buffer.join('\n'), lineCount: buffer.length })
      index += 1
      buffer = []
      bufferLen = 0
    }
    buffer.push(line)
    bufferLen += lineLen
  }
  if (buffer.length > 0) {
    chunks.push({ index, text: buffer.join('\n'), lineCount: buffer.length })
  }
  return chunks
}

export function joinChunks(chunks: string[]): string {
  return chunks.join('\n')
}

// Chunk an array of independent string units (e.g. JSON leaf values, PO entries)
// into groups, joined by a separator that is very unlikely to appear naturally,
// so we can send several small strings in a single API call and split them back.
export const UNIT_SEPARATOR = '\n\u2063\u2063UNIT_SEP\u2063\u2063\n'

export function chunkUnits(units: string[], maxChars: number = DEFAULT_MAX_CHARS): { indices: number[]; text: string }[] {
  const groups: { indices: number[]; text: string }[] = []
  let curIndices: number[] = []
  let curParts: string[] = []
  let curLen = 0

  units.forEach((unit, i) => {
    const addLen = unit.length + UNIT_SEPARATOR.length
    if (curLen + addLen > maxChars && curParts.length > 0) {
      groups.push({ indices: curIndices, text: curParts.join(UNIT_SEPARATOR) })
      curIndices = []
      curParts = []
      curLen = 0
    }
    curIndices.push(i)
    curParts.push(unit)
    curLen += addLen
  })

  if (curParts.length > 0) {
    groups.push({ indices: curIndices, text: curParts.join(UNIT_SEPARATOR) })
  }
  return groups
}

export function splitUnits(translatedText: string, expectedCount: number): string[] {
  const parts = translatedText.split(UNIT_SEPARATOR)
  if (parts.length !== expectedCount) {
    // Fallback: try trimming whitespace variants around the separator
    const normalized = translatedText.split(/\s*\u2063\u2063UNIT_SEP\u2063\u2063\s*/)
    if (normalized.length === expectedCount) return normalized
  }
  return parts
}
