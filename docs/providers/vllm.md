# vLLM Provider

Use this page when connecting a vLLM OpenAI-compatible server to ModelDock.

## Setup

1. Run `vllm serve` on a private host or localhost.
2. Configure an API key for the vLLM server.
3. In ModelDock Provider Settings, choose `vLLM`.
4. Enter the private endpoint URL and API key.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `vllm` |
| Default endpoint | `http://127.0.0.1:8000/v1` |
| Validation URL | `http://127.0.0.1:8000/v1/models` |
| Credential type | OpenAI-compatible API key |

## Security

Do not expose vLLM directly to the public internet. Keep it on a private listener or protected internal network, and route user traffic through ModelDock and LiteLLM.

Rotate exposed vLLM API keys on the server, then rotate or delete the matching ModelDock credential.

## Source

- vLLM OpenAI-compatible server docs: https://docs.vllm.ai/en/v0.7.0/serving/openai_compatible_server.html

Last updated: 2026-05-03
