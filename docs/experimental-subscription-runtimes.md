# Experimental local subscription runtimes

ModelDock's stable provider model is BYOK and platform-owned API keys through
LiteLLM. Local subscription runtimes are experimental and disabled by default.

This feature follows the same operator pattern used by local agent adapters:
ModelDock checks whether a host CLI is installed and authenticated, then lets an
admin decide whether that runtime may be used for a specific user or workspace.
ModelDock does not read, display, store, or sync OAuth access tokens.

## Reference pattern

Paperclip documents local process adapters for Codex and Claude Code. Their
adapter overview describes a control plane that looks up an adapter type,
spawns or calls the local agent runtime, captures structured output, and keeps
runtime-specific configuration outside the product API surface. Their Codex and
Claude local adapter docs also call out CLI installation checks, working
directory isolation, session persistence, and environment tests.

ModelDock should follow the same boundary shape, but keep the feature narrower
for now:

- probe CLI installation and login state first;
- do not intercept or persist provider OAuth tokens;
- keep subscription runtimes behind experimental flags;
- later move actual agent/process execution into an isolated worker package.

References:

- Paperclip adapter overview: <https://docs.paperclip.ing/adapters/overview>
- Paperclip Codex local adapter: <https://docs.paperclip.ing/adapters/codex-local>
- Paperclip Claude local adapter: <https://docs.paperclip.ing/adapters/claude-local>

## Supported probes

| Runtime | Flag | Status command | Login command |
| --- | --- | --- | --- |
| Codex CLI | `EXPERIMENTAL_CHATGPT_SUBSCRIPTION=true` | `codex login status` | `codex login` |
| Claude Code CLI | `EXPERIMENTAL_CLAUDE_SUBSCRIPTION=true` | `claude auth status` | `claude auth login` |

Both also require:

```env
EXPERIMENTAL_SUBSCRIPTION_OAUTH=true
```

Optional command overrides:

```env
MODELDOCK_CODEX_COMMAND=codex
MODELDOCK_CLAUDE_COMMAND=claude
MODELDOCK_RUNTIME_WORKDIR=/tmp
```

## Admin workflow

1. Sign in to the admin surface.
2. Open **Runtimes**.
3. Confirm whether each local CLI is disabled, missing, unauthenticated, ready,
   or errored.
4. Run a short test prompt only from the protected admin surface.
5. Keep the runtime disabled for users unless provider terms explicitly allow
   the intended use.

## Invocation guardrails

The current invocation path is intentionally narrow:

- admin session and CSRF are required;
- prompts are capped at 4000 characters;
- output is capped and obvious token-shaped strings are redacted;
- Codex runs through `codex exec` with read-only sandboxing, no approvals, and
  ephemeral session storage;
- Claude runs through `claude --print` with no session persistence and no tools;
- shell interpolation is not used. Commands are executed with direct argv
  arrays.

This is a readiness test surface, not the final user chat runtime. The
production design should move invocation into an isolated worker or sidecar with
per-user runtime homes, concurrency limits, audit metadata, and explicit admin
policy assignment before normal users can select it.

## Security rules

- Local runtime checks are admin-only.
- OAuth tokens stay in the CLI's own local auth store.
- Do not use one personal subscription as a shared backend for multiple users
  unless the provider explicitly permits it.
- Release deployments should run these adapters in a dedicated worker or sidecar
  with scoped filesystem access, not in the public API container.
- ModelDock must keep this path removable without breaking BYOK or LiteLLM
  provider routing.

## Kubernetes note

The local all-in-one chart can show the flags and UI, but the API container will
report `missing` unless the relevant CLI is installed inside that runtime. For a
real deployment, mount an isolated runtime home and install the CLI in a worker
image instead of mounting a developer's full home directory.
