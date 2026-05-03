[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md) | Español | [Tiếng Việt](README.vi.md) | [Português](README.pt.md)

# ModelDock

[![npm version](https://img.shields.io/npm/v/modeldock?color=cb3837)](https://www.npmjs.com/package/modeldock)
[![CLI package](https://img.shields.io/npm/v/@modeldock/cli?label=%40modeldock%2Fcli&color=cb3837)](https://www.npmjs.com/package/@modeldock/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ModelDock es un plano de control open source para aplicaciones LLM multiusuario y autohospedadas basadas en LiteLLM.
Reúne proveedores, credenciales BYOK, créditos, presupuestos, enrutamiento LiteLLM, interfaces de chat, flujos administrativos, MCP, habilidades y plantillas de despliegue en un solo servicio desplegable.

## Qué es ModelDock

ModelDock proporciona la capa operativa para ejecutar un servicio LLM privado. Los usuarios pueden conectar sus propias claves de OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM o endpoints compatibles con OpenAI. Los operadores pueden administrar créditos por usuario, presupuestos, permisos de modelos, registros de auditoría y valores seguros por defecto.

ModelDock no es un proveedor de modelos ni un procesador de pagos. Tampoco es una herramienta para eludir términos, facturación o límites de los proveedores. El modelo estable de conexión usa claves API propiedad del usuario, claves de plataforma configuradas por el operador, endpoints compatibles con OpenAI y proveedores soportados por LiteLLM.

## Arquitectura

```text
Navegador
  -> Web App
      -> Chat de usuario, configuración de proveedores, panel de créditos
  -> Public API
      -> Auth, perfil, almacenamiento de chats, bóveda BYOK, ledger de créditos
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / otros
  -> Admin App
      -> Usuarios, créditos, proveedores, estado LiteLLM, auditoría, ajustes
```

La integración con LiteLLM está aislada en `packages/litellm`, para que las actualizaciones del proxy no se propaguen por toda la aplicación.

## Inicio rápido

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

Endpoints locales por defecto:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   solo red interna de Docker por defecto
Postgres:  solo red interna de Docker por defecto
```

## Seguridad por defecto

- La app, la app admin y la API se enlazan a localhost salvo exposición explícita.
- La superficie admin debe ejecutarse en un hostname separado y protegido.
- El registro público está desactivado por defecto.
- No se requiere una clave de proveedor para iniciar la app.
- El modo producción debe rechazar secretos predecibles de placeholder.
- La clave maestra de LiteLLM y los tokens admin no deben llegar al navegador.
- No se deben registrar por defecto chats, claves de proveedor, tokens OAuth, tokens de sesión, headers de autorización ni payloads secretos de MCP.

## Áreas principales

| Área | Estado |
| --- | --- |
| Enrutamiento LiteLLM | Infraestructura requerida |
| Bóveda BYOK | Diseño de almacenamiento cifrado |
| Créditos y presupuestos | Ledger ModelDock + presupuesto LiteLLM |
| Chats y carpetas | Modo servidor y modo local-only |
| RAG | Weaviate, Redis, PostgreSQL y almacenamiento compatible con S3 |
| MCP y habilidades | Configuración por usuario, permisos y auditoría |
| Admin app | Host protegido separado y control por roles |

## Documentación

- [Despliegue Docker](docs/deployment/docker.md)
- [Despliegue Cloudflare](docs/deployment/cloudflare.md)
- [Integración LiteLLM](docs/litellm.md)
- [Modelo de seguridad](docs/security.md)
- [BYOK](docs/byok.md)
- [Documentación de proveedores](docs/providers/README.md)

## Licencia

ModelDock se publica bajo la [MIT License](LICENSE).
