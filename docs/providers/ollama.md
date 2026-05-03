# Ollama Provider

Use this page when connecting an Ollama OpenAI-compatible endpoint to ModelDock.

## Setup

1. Run Ollama on a private host or localhost.
2. Pull the models you want to expose.
3. In ModelDock Provider Settings, choose `Ollama`.
4. Use the private endpoint URL and the configured placeholder API key value.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `ollama` |
| Default endpoint | `http://127.0.0.1:11434/v1` |
| Validation URL | `http://127.0.0.1:11434/api/tags` |
| Credential type | OpenAI-compatible key field, ignored by Ollama |

## Security

Do not expose Ollama directly to the public internet. Put it on a private network and route access through ModelDock and LiteLLM.

Ollama's OpenAI-compatible API requires an API key field in some clients, but the local server may ignore the value. Treat endpoint access as the real security boundary.

## Source

- Ollama OpenAI compatibility docs: https://docs.ollama.com/openai

Last updated: 2026-05-03
