[English](README.md) | 한국어 | [中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

![ModelDock 앱 아이콘](apps/docs/public/modeldock-app-icon.png)

ModelDock은 LiteLLM 기반의 셀프 호스팅 다중 사용자 LLM 앱을 위한 오픈소스 컨트롤 플레인입니다.
프로바이더 연결, BYOK 자격 증명, 크레딧, 예산, LiteLLM 라우팅, 채팅 UI, 관리자 워크플로, MCP, 스킬, 배포 템플릿을 하나의 서비스로 묶습니다.

ModelDock은 단순 채팅 화면보다 운영자 문제에서 출발합니다. 안전한 온보딩, 사용자별 프로바이더 키, 크레딧, 예산, 승인 게이트, LiteLLM 오케스트레이션, 관리자 분리, 로컬 기본 배포 모드를 함께 제공합니다.

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

## 디버그 모드와 릴리스 모드

디버그 모드는 localhost 테스트용입니다. 활성 owner/admin이 없으면 첫 관리자 계정은 `admin/admin`으로 생성되고, 첫 로그인 후 ID 또는 이메일과 비밀번호를 바꾸는 화면으로 이동합니다. 취소할 수 있지만 기본 계정이 계속 활성화되므로 짧은 로컬 테스트에만 사용해야 합니다.

릴리스 모드는 실제 도메인 연결용입니다. `admin/admin`을 생성하지 않고, 빈 관리자 allowlist는 닫힌 상태로 동작합니다. Kubernetes 서비스는 기본적으로 `ClusterIP`로 유지하고, 먼저 일반 사용자 페이지부터 명시적으로 노출합니다.

관리자 접근은 허용된 IP 또는 기기 fingerprint 중 하나가 일치하면 통과합니다. 웹 브라우저는 실제 클라이언트 MAC 주소를 안정적으로 제공하지 않으므로 MAC 항목은 운영자가 관리하는 기기 fingerprint로 취급합니다.

## 회원가입 승인

사용자는 사용자 앱에서 가입 요청을 제출하고, owner 또는 admin이 관리자 앱에서 승인해야 서비스를 사용할 수 있습니다.

## 다국어 UI

페이지 언어는 Cloudflare `CF-IPCountry`, 브라우저 `Accept-Language`, 영어 기본값 순서로 결정됩니다. 현재 README 번역 언어와 동일하게 영어, 한국어, 중국어, 일본어, 스페인어, 베트남어, 포르투갈어를 지원합니다.

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
| 실험적 로컬 런타임 | Codex CLI / Claude Code CLI 로그인 상태 확인, 토큰 미저장 |

## 문서

- [Docker 배포](docs/deployment/docker.md)
- [빠른 시작](docs/quickstart.md)
- [관리자 가이드](docs/admin-guide.md)
- [사용자 가이드](docs/user-guide.md)
- [디버그/릴리스 모드](docs/deployment/modes.md)
- [Cloudflare 배포](docs/deployment/cloudflare.md)
- [LiteLLM 연동](docs/litellm.md)
- [보안 모델](docs/security.md)
- [BYOK](docs/byok.md)
- [실험적 로컬 구독 런타임](docs/experimental-subscription-runtimes.md)
- [제공자 문서](docs/providers/README.md)

## 라이선스

ModelDock은 [MIT License](LICENSE)로 배포됩니다.
