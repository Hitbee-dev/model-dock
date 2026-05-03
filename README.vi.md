[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md) | Tiếng Việt | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli&color=cb3837)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock là control plane mã nguồn mở cho ứng dụng LLM tự host, nhiều người dùng, xây trên LiteLLM.
Nó gom provider, thông tin xác thực BYOK, credit, ngân sách, định tuyến LiteLLM, giao diện chat, quy trình admin, MCP, skill và mẫu triển khai vào một dịch vụ có thể triển khai.

## ModelDock là gì

ModelDock cung cấp lớp vận hành để chạy một dịch vụ LLM riêng. Người dùng có thể kết nối khóa OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM hoặc endpoint tương thích OpenAI của chính họ. Người vận hành có thể quản lý credit theo người dùng, ngân sách, quyền model, audit log và mặc định triển khai an toàn.

ModelDock không phải provider model hay bộ xử lý thanh toán. Nó không phải công cụ để né điều khoản, tính phí hoặc giới hạn tốc độ của provider. Mô hình kết nối ổn định là API key do người dùng sở hữu, platform key do chủ server cấu hình, endpoint tương thích OpenAI và provider được LiteLLM hỗ trợ.

## Kiến trúc

```text
Trình duyệt
  -> Web App
      -> Chat UI, cài đặt provider, bảng credit
  -> Public API
      -> Auth, hồ sơ, lưu chat, BYOK vault, sổ cái credit
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / provider khác
  -> Admin App
      -> Người dùng, credit, provider, trạng thái LiteLLM, audit log, cài đặt
```

Tích hợp LiteLLM được cô lập trong `packages/litellm`, giúp cập nhật proxy mà không rải chi tiết gateway khắp ứng dụng.

## Bắt đầu nhanh

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cp .env.example .env
docker compose config
docker compose up -d
```

Endpoint local mặc định:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   chỉ trong mạng Docker theo mặc định
Postgres:  chỉ trong mạng Docker theo mặc định
```

## Mặc định bảo mật

- App, admin app và API chỉ bind localhost trừ khi được expose rõ ràng.
- Bề mặt admin phải chạy trên hostname riêng được bảo vệ.
- Đăng ký công khai tắt theo mặc định.
- Không cần khóa provider để khởi động app.
- Chế độ production phải từ chối secret placeholder dễ đoán.
- LiteLLM master key và admin token không được gửi tới trình duyệt.
- Không log nội dung chat, provider key, OAuth token, session token, authorization header hoặc MCP secret payload theo mặc định.

## Phạm vi chính

| Phạm vi | Trạng thái |
| --- | --- |
| Định tuyến LiteLLM | Hạ tầng bắt buộc |
| BYOK vault | Thiết kế lưu trữ mã hóa |
| Credit và ngân sách | Sổ cái ModelDock + ngân sách LiteLLM |
| Chat và thư mục | Chế độ server và local-only |
| RAG | Weaviate, Redis, PostgreSQL và lưu trữ tương thích S3 |
| MCP và skill | Cấu hình theo người dùng, prompt quyền, metadata audit |
| Admin app | Host riêng được bảo vệ và kiểm soát theo role |

## Tài liệu

- [Triển khai Docker](docs/deployment/docker.md)
- [Triển khai Cloudflare](docs/deployment/cloudflare.md)
- [Tích hợp LiteLLM](docs/litellm.md)
- [Mô hình bảo mật](docs/security.md)
- [BYOK](docs/byok.md)
- [Tài liệu provider](docs/providers/README.md)

## Giấy phép

ModelDock được phát hành theo [MIT License](LICENSE).
