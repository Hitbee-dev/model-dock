[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Tiếng Việt](README.vi.md) | Português

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock é um control plane open source para apps LLM multiusuário e self-hosted construídos sobre LiteLLM.
Ele reúne provedores, credenciais BYOK, créditos, orçamentos, roteamento LiteLLM, interfaces de chat, fluxos administrativos, MCP, skills e templates de deploy em um serviço implantável.

## O que é ModelDock

ModelDock oferece a camada operacional para executar um serviço LLM privado. Usuários podem conectar suas próprias chaves OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM ou endpoints compatíveis com OpenAI. Operadores podem gerenciar créditos por usuário, orçamentos, permissões de modelos, logs de auditoria e padrões seguros de implantação.

ModelDock não é provedor de modelos nem processador de pagamentos. Também não é uma ferramenta para contornar termos, cobrança ou limites dos provedores. O modelo estável de conexão usa API keys do usuário, chaves de plataforma configuradas pelo operador, endpoints compatíveis com OpenAI e provedores suportados pelo LiteLLM.

## Arquitetura

```text
Navegador
  -> Web App
      -> Chat do usuário, configurações de provedor, painel de créditos
  -> Public API
      -> Auth, perfil, armazenamento de chats, vault BYOK, ledger de créditos
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / outros
  -> Admin App
      -> Usuários, créditos, provedores, status LiteLLM, auditoria, configurações
```

A integração LiteLLM fica isolada em `packages/litellm`, facilitando atualizações do proxy sem espalhar detalhes do gateway pela aplicação.

## Início rápido

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

Endpoints locais padrão:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   apenas rede interna Docker por padrão
Postgres:  apenas rede interna Docker por padrão
```

## Padrões de segurança

- App, admin app e API bindam em localhost salvo exposição explícita.
- A superfície admin deve rodar em hostname separado e protegido.
- Registro público é desativado por padrão.
- Nenhuma chave de provedor é necessária para iniciar a aplicação.
- Modo produção deve rejeitar secrets placeholder previsíveis.
- LiteLLM master key e tokens admin não devem ir para o navegador.
- Conteúdo de chat, provider keys, OAuth tokens, session tokens, authorization headers e MCP secret payloads não devem ser logados por padrão.

## Áreas principais

| Área | Status |
| --- | --- |
| Roteamento LiteLLM | Infraestrutura obrigatória |
| Vault BYOK | Design de armazenamento criptografado |
| Créditos e orçamentos | Ledger ModelDock + orçamento LiteLLM |
| Chats e pastas | Modo servidor e modo local-only |
| RAG | Weaviate, Redis, PostgreSQL e armazenamento compatível com S3 |
| MCP e skills | Configuração por usuário, prompt de permissão e auditoria |
| Admin app | Host protegido separado e controle por papéis |

## Documentação

- [Deploy Docker](docs/deployment/docker.md)
- [Deploy Cloudflare](docs/deployment/cloudflare.md)
- [Integração LiteLLM](docs/litellm.md)
- [Modelo de segurança](docs/security.md)
- [BYOK](docs/byok.md)
- [Documentação de provedores](docs/providers/README.md)

## Licença

ModelDock é publicado sob a [MIT License](LICENSE).
