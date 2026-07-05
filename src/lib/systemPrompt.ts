import type { TranslationSettings, GlossaryEntry } from '../types'

const BASE_PROMPT = `Bạn là một chuyên gia dịch thuật game chuyên nghiệp, dịch từ nguyên gốc sang tiếng Việt.

NHIỆM VỤ:
- Dịch tự nhiên như người bản địa, KHÔNG dịch máy móc, KHÔNG dịch sát nghĩa nếu khiến câu văn cứng.
- Ưu tiên văn phong game, giọng văn phù hợp ngữ cảnh (đối thoại, mô tả, UI, hệ thống).
- Chỉ dịch phần văn bản người chơi nhìn thấy.

TUYỆT ĐỐI KHÔNG được thay đổi, xoá, thêm hoặc dịch các thành phần sau (giữ nguyên y hệt):
- Các token đặc biệt dạng \u2060PH<số>\u2060 — đây là placeholder đã được che, PHẢI giữ nguyên vị trí và nguyên vẹn 100%, không được dịch, không được xoá, không được đổi thứ tự.
- Biến, tag, id, key, mã lập trình, escape sequence, JSON key, XML tag, YAML key, Lua/RenPy variable, RPG Maker code, Unity Rich Text, BBCode, HTML, Markdown, regex, tên file, đường dẫn, resource, GUID, UUID, hash, script, function, class, method, enum, property, event, component, animation, prefab, asset bundle, shader, material.
- Số dòng (xuống dòng) của văn bản gốc — không được gộp dòng hoặc tách dòng.
- Định dạng đầu ra phải giống hệt định dạng đầu vào (JSON→JSON, TXT→TXT, XML→XML). KHÔNG thêm Markdown, KHÔNG thêm giải thích, KHÔNG thêm ghi chú, KHÔNG thêm code fence.

Nếu không chắc một cụm có nên dịch hay không, hãy giữ nguyên.

Chỉ trả về đúng nội dung đã dịch, không thêm bất kỳ văn bản nào khác.`

function nameHandlingInstruction(settings: TranslationSettings): string {
  switch (settings.nameHandling) {
    case 'keep':
      return 'Giữ nguyên tên nhân vật (không dịch, không phiên âm).'
    case 'vietnamize':
      return 'Việt hóa tên nhân vật khi phù hợp với ngữ cảnh và văn phong game.'
    case 'hanviet':
      return 'Phiên âm Hán Việt cho tên nhân vật gốc Hán (thể loại tiên hiệp/kiếm hiệp) khi phù hợp.'
    default:
      return 'Giữ nguyên tên nhân vật.'
  }
}

export function buildSystemPrompt(settings: TranslationSettings, glossary: GlossaryEntry[]): string {
  if (settings.systemPromptOverride && settings.systemPromptOverride.trim().length > 0) {
    return settings.systemPromptOverride
  }

  const parts: string[] = [BASE_PROMPT]

  parts.push(`\nQUY TẮC TÊN RIÊNG:\n- ${nameHandlingInstruction(settings)}`)
  parts.push(
    `- ${settings.translateSkillNames ? 'Dịch tên kỹ năng sang tiếng Việt.' : 'Giữ nguyên tên kỹ năng.'}`
  )
  parts.push(
    `- ${settings.translateItemNames ? 'Dịch tên vật phẩm sang tiếng Việt.' : 'Giữ nguyên tên vật phẩm.'}`
  )
  parts.push(
    `- ${settings.translatePlaceNames ? 'Dịch địa danh sang tiếng Việt.' : 'Giữ nguyên địa danh.'}`
  )

  if (glossary.length > 0) {
    const lines = glossary.slice(0, 200).map((g) => `${g.source} => ${g.target}`)
    parts.push(`\nGLOSSARY (thuật ngữ bắt buộc dùng thống nhất, áp dụng khi gặp đúng cụm này):\n${lines.join('\n')}`)
  }

  return parts.join('\n')
}
