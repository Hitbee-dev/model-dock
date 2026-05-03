[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | 日本語 | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock は、LiteLLM を基盤にしたセルフホスト型マルチユーザー LLM アプリ向けのオープンソース control plane です。
プロバイダー接続、BYOK 認証情報、クレジット、予算、LiteLLM ルーティング、チャット UI、管理ワークフロー、MCP、スキル、デプロイテンプレートを 1 つのサービスとしてまとめます。

## ModelDock とは

ModelDock は、プライベートな LLM サービスを運用するためのサービス運用レイヤーです。ユーザーは自分の OpenAI、Anthropic、Gemini、OpenRouter、Ollama、vLLM、または OpenAI 互換キーを接続でき、運用者はユーザーごとのクレジット、予算、モデル権限、監査ログ、安全なデプロイ既定値を管理できます。

ModelDock はモデルプロバイダーでも決済処理サービスでもありません。プロバイダーの規約、課金、レート制限を回避するためのツールではありません。安定した接続モデルは、ユーザー所有 API キー、サーバー運用者が設定するプラットフォームキー、OpenAI 互換エンドポイント、LiteLLM 対応プロバイダーです。

## アーキテクチャ

```text
Browser
  -> Web App
      -> ユーザー向けチャット UI、プロバイダー設定、クレジットダッシュボード
  -> Public API
      -> 認証、ユーザープロファイル、チャット保存、BYOK vault、クレジット台帳
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / その他
  -> Admin App
      -> ユーザー、クレジット、プロバイダー、LiteLLM 状態、監査ログ、システム設定
```

LiteLLM 連携は `packages/litellm` に分離されており、LiteLLM の更新をアプリ全体へ広げずに扱える設計です。

## クイックスタート

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

既定のローカルエンドポイント:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   既定では Docker 内部ネットワークのみ
Postgres:  既定では Docker 内部ネットワークのみ
```

## セキュリティ既定値

- アプリ、管理アプリ、API は明示的に公開しない限り localhost にのみ bind します。
- 管理画面はユーザーアプリとは別の保護されたホストで運用します。
- 公開ユーザー登録は既定で無効です。
- プロバイダーキーなしでアプリを起動できます。
- 本番モードでは予測可能なプレースホルダー secret を拒否する必要があります。
- LiteLLM master key と管理トークンをブラウザへ送信してはいけません。
- チャット内容、プロバイダーキー、OAuth token、session token、authorization header、MCP secret payload は既定でログに残しません。

## 主要領域

| 領域 | 状態 |
| --- | --- |
| LiteLLM ルーティング | 必須インフラ |
| BYOK credential vault | 暗号化保存設計 |
| クレジットと予算 | ModelDock 台帳 + LiteLLM 予算マッピング |
| チャットとフォルダー | サーバー保存モードとローカル専用モード |
| RAG | Weaviate、Redis、PostgreSQL、S3 互換ストレージ |
| MCP とスキル | ユーザー別設定、権限プロンプト、監査メタデータ |
| 管理アプリ | 別ホスト保護と role-based access control |

## ドキュメント

- [Docker デプロイ](docs/deployment/docker.md)
- [Cloudflare デプロイ](docs/deployment/cloudflare.md)
- [LiteLLM 連携](docs/litellm.md)
- [セキュリティモデル](docs/security.md)
- [BYOK](docs/byok.md)
- [プロバイダー文書](docs/providers/README.md)

## ライセンス

ModelDock は [MIT License](LICENSE) で公開されています。
