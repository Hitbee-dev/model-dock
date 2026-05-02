export type ModelDockEnv = {
  nodeEnv: string;
  publicAppUrl: string;
  publicApiUrl: string;
  adminAppUrl: string;
  databaseUrl: string;
  sessionSecret: string;
  credentialEncryptionKey: string;
  credentialEncryptionKeyId: string;
  ownerBootstrapToken: string;
  litellmBaseUrl: string;
  litellmMasterKey: string;
  experimentalSubscriptionOAuth: boolean;
  experimentalChatGPTSubscription: boolean;
  experimentalClaudeSubscription: boolean;
};

const placeholderPrefix = "replace-with-";

function requireValue(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readBoolean(source: NodeJS.ProcessEnv, key: string): boolean {
  return source[key] === "true";
}

export function validateModelDockEnv(source: NodeJS.ProcessEnv): ModelDockEnv {
  const nodeEnv = source.NODE_ENV ?? "development";
  const config: ModelDockEnv = {
    nodeEnv,
    publicAppUrl: requireValue(source, "PUBLIC_APP_URL"),
    publicApiUrl: requireValue(source, "PUBLIC_API_URL"),
    adminAppUrl: requireValue(source, "ADMIN_APP_URL"),
    databaseUrl: requireValue(source, "DATABASE_URL"),
    sessionSecret: requireValue(source, "SESSION_SECRET"),
    credentialEncryptionKey: requireValue(source, "CREDENTIAL_ENCRYPTION_KEY"),
    credentialEncryptionKeyId: source.CREDENTIAL_ENCRYPTION_KEY_ID ?? "default-v1",
    ownerBootstrapToken: requireValue(source, "OWNER_BOOTSTRAP_TOKEN"),
    litellmBaseUrl: requireValue(source, "LITELLM_BASE_URL"),
    litellmMasterKey: requireValue(source, "LITELLM_MASTER_KEY"),
    experimentalSubscriptionOAuth: readBoolean(source, "EXPERIMENTAL_SUBSCRIPTION_OAUTH"),
    experimentalChatGPTSubscription: readBoolean(source, "EXPERIMENTAL_CHATGPT_SUBSCRIPTION"),
    experimentalClaudeSubscription: readBoolean(source, "EXPERIMENTAL_CLAUDE_SUBSCRIPTION")
  };

  if (nodeEnv === "production") {
    for (const value of [
      config.databaseUrl,
      config.sessionSecret,
      config.credentialEncryptionKey,
      config.ownerBootstrapToken,
      config.litellmMasterKey
    ]) {
      if (value.includes(placeholderPrefix)) {
        throw new Error("Production configuration cannot use placeholder secrets.");
      }
    }
  }

  return config;
}
