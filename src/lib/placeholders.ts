// Masks anything that must survive translation untouched, so the LLM never
// sees the raw token and cannot "helpfully" translate/alter it.
// After translation we restore the original tokens back into place.

export interface MaskResult {
  masked: string
  map: Map<string, string>
}

// Order matters: longer/more specific patterns first.
const PATTERNS: RegExp[] = [
  /\{\{[^}]*\}\}/g,          // {{...}}
  /\[\[[^\]]*\]\]/g,         // [[...]]
  /\$\([^)]*\)/g,            // $(...)
  /\$\{[^}]*\}/g,            // ${money}
  /\{[a-zA-Z0-9_]*\}/g,      // {0} {name} {player}
  /\[[a-zA-Z0-9_]+\]/g,      // [player]
  /<\/?[a-zA-Z][^<>]*>/g,    // <color> </color> <b> <sprite=..> <size=..>
  /%[sdifgxX%]/g,            // %s %d %i %f %g
  /@[a-zA-Z0-9_]+/g,         // @xxx
  /\\[nrt]/g,                // \n \r \t (literal backslash sequences in text)
  /#[a-zA-Z0-9_]+\(/g,       // #define-like tokens (rare in strings, safe-guard)
]

export function maskProtectedTokens(text: string): MaskResult {
  const map = new Map<string, string>()
  let counter = 0
  let masked = text

  for (const pattern of PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      const token = `\u2060PH${counter}\u2060` // word-joiner wrapped token, invisible & unlikely to be translated/mangled
      map.set(token, match)
      counter += 1
      return token
    })
  }

  return { masked, map }
}

export function restoreProtectedTokens(translated: string, map: Map<string, string>): string {
  let result = translated
  for (const [token, original] of map) {
    // Be lenient: model may alter surrounding whitespace but token itself should survive
    result = result.split(token).join(original)
  }
  return result
}

// Validates that every protected token/placeholder in `original` still appears
// (in some form) in `translated`. Returns list of missing tokens.
export function validatePlaceholdersPreserved(original: string, translated: string): string[] {
  const missing: string[] = []
  for (const pattern of PATTERNS) {
    const originalMatches = original.match(pattern) || []
    for (const m of originalMatches) {
      if (!translated.includes(m)) {
        missing.push(m)
      }
    }
  }
  return missing
}

export function countNewlines(text: string): number {
  return (text.match(/\n/g) || []).length
}
