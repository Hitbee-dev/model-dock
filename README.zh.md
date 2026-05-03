[English](README.md) | [한국어](README.ko.md) | 中文 | [日本語](README.ja.md) | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli&color=cb3837)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock 是基于 LiteLLM 的开源控制平面，用于自托管的多用户 LLM 应用。
它把模型提供商接入、BYOK 凭证、额度、预算、LiteLLM 路由、聊天界面、管理流程、MCP、技能和部署模板整合成一个可部署服务。

## ModelDock 是什么

ModelDock 为私有 LLM 服务提供运营层。用户可以连接自己的 OpenAI、Anthropic、Gemini、OpenRouter、Ollama、vLLM 或 OpenAI 兼容密钥；运营者可以管理每个用户的额度、预算、模型权限、审计日志和安全部署默认值。

ModelDock 不是模型提供商，也不是支付处理器。它不是用于绕过提供商条款、计费或速率限制的工具。稳定连接模型是用户自有 API key、服务器运营者配置的平台 key、OpenAI 兼容端点以及 LiteLLM 支持的提供商。

## 架构

```text
浏览器
  -> Web App
      -> 用户聊天界面、提供商设置、额度面板
  -> Public API
      -> 认证、用户资料、聊天存储、BYOK 凭证库、额度账本
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / 其他提供商
  -> Admin App
      -> 用户、额度、提供商、LiteLLM 状态、审计日志、系统设置
```

LiteLLM 集成被隔离在 `packages/litellm` 中，便于跟进 LiteLLM 更新而不扩散网关细节。

## 快速开始

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

默认本地端点：

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   默认仅限 Docker 内部网络
Postgres:  默认仅限 Docker 内部网络
```

## 安全默认值

- 应用、管理应用和 API 默认只绑定 localhost。
- 管理界面必须部署在独立受保护主机名上。
- 公开注册默认关闭。
- 启动应用不需要提供商密钥。
- 生产模式必须拒绝可预测的占位密钥。
- LiteLLM master key 和管理令牌不得发送到浏览器。
- 默认不记录聊天内容、提供商 key、OAuth token、session token、authorization header 或 MCP secret payload。

## 核心领域

| 领域 | 状态 |
| --- | --- |
| LiteLLM 路由 | 必需基础设施 |
| BYOK 凭证库 | 加密存储设计 |
| 额度和预算 | ModelDock 账本 + LiteLLM 预算映射 |
| 聊天和文件夹 | 服务端存储模式和本地-only 模式 |
| RAG | 基于 Weaviate、Redis、PostgreSQL 和 S3 兼容存储 |
| MCP 和技能 | 用户级配置、权限提示、审计元数据 |
| 管理应用 | 独立受保护主机和基于角色的访问控制 |

## 文档

- [Docker 部署](docs/deployment/docker.md)
- [Cloudflare 部署](docs/deployment/cloudflare.md)
- [LiteLLM 集成](docs/litellm.md)
- [安全模型](docs/security.md)
- [BYOK](docs/byok.md)
- [提供商文档](docs/providers/README.md)

## 许可证

ModelDock 采用 [MIT License](LICENSE) 发布。
