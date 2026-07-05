export interface ValidationResult {
  ok: boolean
  issues: string[]
}

export function validateJson(text: string): ValidationResult {
  try {
    JSON.parse(text)
    return { ok: true, issues: [] }
  } catch (e) {
    return { ok: false, issues: [`JSON không hợp lệ: ${(e as Error).message}`] }
  }
}

export function validateXml(text: string): ValidationResult {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')
    const errorNode = doc.querySelector('parsererror')
    if (errorNode) {
      return { ok: false, issues: [`XML không hợp lệ: ${errorNode.textContent?.slice(0, 200) ?? 'lỗi cú pháp'}`] }
    }
    return { ok: true, issues: [] }
  } catch (e) {
    return { ok: false, issues: [`XML không hợp lệ: ${(e as Error).message}`] }
  }
}

export function validateLineCount(original: string, translated: string): ValidationResult {
  const a = original.split('\n').length
  const b = translated.split('\n').length
  if (a !== b) {
    return { ok: false, issues: [`Số dòng thay đổi: ${a} → ${b}`] }
  }
  return { ok: true, issues: [] }
}
