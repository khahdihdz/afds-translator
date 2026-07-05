# AFDS Translator

WebTool AI dịch nội dung game sang tiếng Việt bằng DeepSeek V4 (Flash / Pro), qua API `https://api.vilao.ai/v1`.

Dịch tự nhiên như người bản địa — giữ nguyên toàn bộ biến, placeholder, tag và cấu trúc file gốc.

## Chạy thử (local)

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`, vào **Cài đặt** để nhập API Key trước khi dịch.

## Build production

```bash
npm run build
npm run preview
```

## Triển khai

**Vercel**: import repo, framework preset "Vite" tự động nhận diện. Không cần cấu hình thêm — không có routing phía server nên không cần rewrites.

**Cloudflare Pages**:
- Build command: `npm run build`
- Output directory: `dist`

## Kiến trúc

```
src/
  lib/
    placeholders.ts        # Che/khôi phục %s, {0}, {player}, <tag>, \n... trước/sau khi gửi AI
    chunking.ts             # Chia nhỏ văn bản/units theo dòng, không cắt giữa placeholder
    systemPrompt.ts         # Build system prompt nghiêm ngặt + glossary
    deepseek.ts             # Gọi api.vilao.ai/v1, retry, abort, hàng đợi song song
    validators.ts           # Kiểm tra JSON/XML hợp lệ, số dòng không đổi
    translationMemory.ts    # Cache câu đã dịch (localStorage) để dịch nhất quán
    translateFile.ts        # Điều phối theo định dạng file
    zipHandler.ts           # Giải nén / đóng gói lại ZIP, giữ nguyên cấu trúc
    formats/
      json.ts    # Dịch từng string leaf, giữ nguyên key
      xml.ts     # Dịch text node, giữ nguyên tag/attribute (dùng cho resx, plist)
      po.ts      # Dịch msgstr, giữ nguyên msgid
      plain.ts   # Dịch theo dòng — dùng cho txt/lua/renpy/csv/ini/yaml/js/ts/cs/...
  store/useAppStore.ts   # Zustand store: files, settings, glossary, API key (persist)
  components/            # Trang chủ, Upload, Editor (Monaco), Preview, TM, Glossary, Cài đặt
```

## Định dạng hỗ trợ

Dịch trực tiếp (text-based): `txt, json, xml, csv, yaml, yml, ini, cfg, properties, strings, lang, lua, js, ts, cs, java, kt, renpy, rpy, po, resx, plist`, và `zip` chứa nhiều file trong số trên.

`xlsx, rar, 7z, mo` được giữ nguyên (pass-through) khi đóng gói lại ZIP vì đây là định dạng nhị phân cần thư viện native để đọc/ghi an toàn — tránh làm hỏng file nếu xử lý sai trong trình duyệt.

## Ghi chú bảo mật

API Key chỉ được lưu tại `localStorage` của trình duyệt, không có backend nào khác lưu trữ hay proxy key này.
