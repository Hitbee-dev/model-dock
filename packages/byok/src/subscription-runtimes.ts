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
};

export type SubscriptionRuntimeCommandRunner = (
  command: string,
  args: string[],
  timeoutMs: number
) => Promise<{ exitCode: number; stderr: string; stdout: string }>;

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
