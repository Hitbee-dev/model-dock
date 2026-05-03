export type SubscriptionRuntimeId = "codex_local" | "claude_local";

export type SubscriptionRuntimeStatus = "disabled" | "missing" | "ready" | "unauthenticated" | "error";

export type SubscriptionRuntimeDefinition = {
  id: SubscriptionRuntimeId;
  command: string;
  displayName: string;
  enabled: boolean;
  loginHint: string;
  statusArgs: string[];
  successSignals: string[];
  termsWarning: string;
};

export type SubscriptionRuntimeCommandOptions = {
  cwd?: string;
};

export type SubscriptionRuntimeProbe = {
  command: string;
  id: SubscriptionRuntimeId;
  displayName: string;
  enabled: boolean;
  loginHint: string;
  message: string;
  status: SubscriptionRuntimeStatus;
  termsWarning: string;
};

export type SubscriptionRuntimeConfig = {
  codexCommand?: string;
  claudeCommand?: string;
  experimentalChatGPTSubscription?: boolean;
  experimentalClaudeSubscription?: boolean;
  experimentalSubscriptionOAuth?: boolean;
  runtimeWorkingDirectory?: string;
};

export type SubscriptionRuntimeCommandRunner = (
  command: string,
  args: string[],
  timeoutMs: number,
  options?: SubscriptionRuntimeCommandOptions
) => Promise<{ exitCode: number; stderr: string; stdout: string }>;

export type SubscriptionRuntimeInvocationInput = {
  prompt: string;
  runtimeId: SubscriptionRuntimeId;
};

export type SubscriptionRuntimeInvocationResult = {
  exitCode?: number;
  id: SubscriptionRuntimeId;
  message: string;
  stderr: string;
  stdout: string;
  status: "blocked" | "completed" | "failed";
};

const codexTermsWarning =
  "Experimental local Codex runtime uses the operator's local Codex CLI login. Enable only per user and only when provider terms allow this use.";

const claudeTermsWarning =
  "Experimental local Claude runtime uses the operator's local Claude Code login. Enable only per user and only when provider terms allow this use.";

export function createSubscriptionRuntimeDefinitions(
  config: SubscriptionRuntimeConfig
): SubscriptionRuntimeDefinition[] {
  const oauthEnabled = config.experimentalSubscriptionOAuth === true;
  return [
    {
      id: "codex_local",
      command: config.codexCommand?.trim() || "codex",
      displayName: "Codex CLI",
      enabled: oauthEnabled && config.experimentalChatGPTSubscription === true,
      loginHint: "codex login",
      statusArgs: ["login", "status"],
      successSignals: ["Logged in"],
      termsWarning: codexTermsWarning
    },
    {
      id: "claude_local",
      command: config.claudeCommand?.trim() || "claude",
      displayName: "Claude Code CLI",
      enabled: oauthEnabled && config.experimentalClaudeSubscription === true,
      loginHint: "claude auth login",
      statusArgs: ["auth", "status"],
      successSignals: ['"loggedIn": true', '"loggedIn":true', "Logged in"],
      termsWarning: claudeTermsWarning
    }
  ];
}

export async function probeSubscriptionRuntime(
  runtime: SubscriptionRuntimeDefinition,
  runner: SubscriptionRuntimeCommandRunner
): Promise<SubscriptionRuntimeProbe> {
  if (!runtime.enabled) {
    return toProbe(runtime, "disabled", "Feature flag is disabled.");
  }

  try {
    const result = await runner(runtime.command, runtime.statusArgs, 5_000);
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (result.exitCode === 0 && runtime.successSignals.some((signal) => output.includes(signal))) {
      return toProbe(runtime, "ready", "Local CLI is installed and authenticated.");
    }
    if (result.exitCode === 0) {
      return toProbe(runtime, "unauthenticated", `Run ${runtime.loginHint} on the host.`);
    }
    return toProbe(runtime, "error", "Status command failed without exposing credential data.");
  } catch (error) {
    const message = error instanceof Error && error.message.includes("ENOENT") ? "CLI command was not found." : "Probe failed.";
    return toProbe(runtime, message.includes("not found") ? "missing" : "error", message);
  }
}

export async function probeConfiguredSubscriptionRuntimes(
  config: SubscriptionRuntimeConfig,
  runner: SubscriptionRuntimeCommandRunner
): Promise<SubscriptionRuntimeProbe[]> {
  return Promise.all(createSubscriptionRuntimeDefinitions(config).map((runtime) => probeSubscriptionRuntime(runtime, runner)));
}

export async function invokeConfiguredSubscriptionRuntime(
  config: SubscriptionRuntimeConfig,
  runner: SubscriptionRuntimeCommandRunner,
  input: SubscriptionRuntimeInvocationInput
): Promise<SubscriptionRuntimeInvocationResult> {
  const runtime = createSubscriptionRuntimeDefinitions(config).find((candidate) => candidate.id === input.runtimeId);
  if (!runtime) {
    return blocked(input.runtimeId, "Unknown runtime.");
  }
  if (!runtime.enabled) {
    return blocked(runtime.id, "Feature flag is disabled.");
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    return blocked(runtime.id, "Prompt is required.");
  }
  if (prompt.length > 4_000) {
    return blocked(runtime.id, "Prompt exceeds the 4000 character limit.");
  }

  const probe = await probeSubscriptionRuntime(runtime, runner);
  if (probe.status !== "ready") {
    return blocked(runtime.id, probe.message);
  }

  const workingDirectory = config.runtimeWorkingDirectory?.trim() || "/tmp";
  const command = createInvocationCommand(runtime, prompt, workingDirectory);
  const result = await runner(runtime.command, command.args, 60_000, {
    cwd: workingDirectory
  });
  return {
    exitCode: result.exitCode,
    id: runtime.id,
    message: result.exitCode === 0 ? "Runtime invocation completed." : "Runtime invocation failed.",
    status: result.exitCode === 0 ? "completed" : "failed",
    stderr: redactRuntimeOutput(result.stderr),
    stdout: redactRuntimeOutput(result.stdout)
  };
}

function toProbe(
  runtime: SubscriptionRuntimeDefinition,
  status: SubscriptionRuntimeStatus,
  message: string
): SubscriptionRuntimeProbe {
  return {
    command: runtime.command,
    displayName: runtime.displayName,
    enabled: runtime.enabled,
    id: runtime.id,
    loginHint: runtime.loginHint,
    message,
    status,
    termsWarning: runtime.termsWarning
  };
}

function createInvocationCommand(
  runtime: SubscriptionRuntimeDefinition,
  prompt: string,
  workingDirectory: string
): { args: string[] } {
  if (runtime.id === "codex_local") {
    return {
      args: [
        "exec",
        "--sandbox",
        "read-only",
        "--ask-for-approval",
        "never",
        "--ephemeral",
        "--skip-git-repo-check",
        "-C",
        workingDirectory,
        prompt
      ]
    };
  }

  return {
    args: [
      "--print",
      "--permission-mode",
      "dontAsk",
      "--no-session-persistence",
      "--tools",
      "",
      "--output-format",
      "text",
      prompt
    ]
  };
}

function blocked(runtimeId: SubscriptionRuntimeId, message: string): SubscriptionRuntimeInvocationResult {
  return {
    id: runtimeId,
    message,
    status: "blocked",
    stderr: "",
    stdout: ""
  };
}

function redactRuntimeOutput(output: string): string {
  return output
    .slice(0, 8_000)
    .replace(/(access_token|refresh_token|id_token)["':=\s]+[^"'\s]+/gi, "$1=[redacted]")
    .replace(/authorization:\s*bearer\s+\S+/gi, "authorization: Bearer [redacted]")
    .replace(/sk-[a-z0-9_-]{12,}/gi, "sk-[redacted]");
}
