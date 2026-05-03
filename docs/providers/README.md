# Provider Guides

Use these guides when connecting user-owned provider credentials or private OpenAI-compatible endpoints.

## Supported Guides

- [OpenAI](openai.md)
- [Anthropic](anthropic.md)
- [Google Gemini](gemini.md)
- [OpenRouter](openrouter.md)
- [Ollama](ollama.md)
- [vLLM](vllm.md)

## Baseline Rules

ModelDock validates provider credentials server-side, encrypts credentials at rest, and returns only safe credential references to the browser.

Provider-side limits still matter. Use provider dashboards to set budgets, revoke exposed keys, and monitor usage where available.

Last updated: 2026-05-03
