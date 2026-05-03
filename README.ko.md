[English](README.md) | 한국어 | [中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock은 LiteLLM 기반의 셀프 호스팅 다중 사용자 LLM 앱을 위한 오픈소스 컨트롤 플레인입니다.
프로바이더 연결, BYOK 자격 증명, 크레딧, 예산, LiteLLM 라우팅, 채팅 UI, 관리자 워크플로, MCP, 스킬, 배포 템플릿을 하나의 서비스로 묶습니다.

## ModelDock이 하는 일

ModelDock은 개인 또는 팀이 자체 LLM 서비스를 운영할 때 필요한 서비스 운영 레이어를 제공합니다. 사용자는 자신의 OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM 또는 OpenAI 호환 키를 연결할 수 있고, 운영자는 사용자별 크레딧, 예산, 모델 권한, 감사 로그, 안전한 배포 기본값을 관리할 수 있습니다.

ModelDock은 모델 제공자나 결제 대행사가 아니며, 공급자 약관이나 과금, 속도 제한을 우회하기 위한 도구가 아닙니다. 안정적인 연결 방식은 사용자 소유 API 키, 서버 운영자가 설정한 플랫폼 키, OpenAI 호환 엔드포인트, LiteLLM 지원 프로바이더입니다.

## 아키텍처

```text
브라우저
  -> Web App
      -> 사용자 채팅 UI, 프로바이더 설정, 크레딧 대시보드
  -> Public API
      -> 인증, 사용자 프로필, 채팅 저장, BYOK 금고, 크레딧 원장
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / 기타 프로바이더
  -> Admin App
      -> 사용자, 크레딧, 프로바이더, LiteLLM 상태, 감사 로그, 시스템 설정
```

LiteLLM 연동은 `packages/litellm`에 격리되어 있어 LiteLLM 업데이트가 앱 전체에 퍼지지 않도록 설계합니다.

## 빠른 시작

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

기본 로컬 엔드포인트:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   기본값은 Docker 내부 네트워크 전용
Postgres:  기본값은 Docker 내부 네트워크 전용
```

## 보안 기본값

- 앱, 관리자 앱, API는 명시적으로 노출하지 않는 한 localhost에만 바인딩됩니다.
- 관리자 표면은 사용자 앱과 분리된 호스트에서 운영해야 합니다.
- 공개 회원가입은 기본적으로 꺼져 있습니다.
- 프로바이더 키 없이도 앱을 시작할 수 있습니다.
- 프로덕션 모드는 예측 가능한 기본 비밀값을 거부해야 합니다.
- LiteLLM master key와 관리자 토큰은 브라우저에 전달되지 않아야 합니다.
- 채팅 내용, 프로바이더 키, OAuth 토큰, 세션 토큰, 인증 헤더, MCP 비밀 payload는 로그에 남기지 않습니다.

## 핵심 영역

| 영역 | 상태 |
| --- | --- |
| LiteLLM 라우팅 | 필수 인프라 |
| BYOK 자격 증명 금고 | 암호화 저장 설계 |
| 크레딧과 예산 | ModelDock 원장 + LiteLLM 예산 매핑 |
| 채팅과 폴더 | 서버 저장 모드와 로컬 전용 모드 |
| RAG | Weaviate, Redis, PostgreSQL, S3 호환 저장소 기반 |
| MCP와 스킬 | 사용자별 설정, 권한 프롬프트, 감사 메타데이터 |
| 관리자 앱 | 별도 보호 호스트와 역할 기반 접근 제어 |

## 문서

- [Docker 배포](docs/deployment/docker.md)
- [Cloudflare 배포](docs/deployment/cloudflare.md)
- [LiteLLM 연동](docs/litellm.md)
- [보안 모델](docs/security.md)
- [BYOK](docs/byok.md)
- [제공자 문서](docs/providers/README.md)

## 라이선스

ModelDock은 [MIT License](LICENSE)로 배포됩니다.
