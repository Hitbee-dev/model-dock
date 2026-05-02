export type ModelDockEnv = {
  nodeEnv: string;
  publicAppUrl: string;
  publicApiUrl: string;
  adminAppUrl: string;
  databaseUrl: string;
  redisUrl: string;
  ragEnabled: boolean;
  weaviateUrl: string;
  weaviateApiKey: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
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
    redisUrl: requireValue(source, "REDIS_URL"),
    ragEnabled: source.RAG_ENABLED !== "false",
    weaviateUrl: source.RAG_ENABLED === "false" ? "" : requireValue(source, "WEAVIATE_URL"),
    weaviateApiKey: source.RAG_ENABLED === "false" ? "" : requireValue(source, "WEAVIATE_API_KEY"),
    s3Endpoint: source.RAG_ENABLED === "false" ? "" : requireValue(source, "S3_ENDPOINT"),
    s3Region: source.S3_REGION ?? "us-east-1",
    s3Bucket: source.RAG_ENABLED === "false" ? "" : requireValue(source, "S3_BUCKET"),
    s3AccessKeyId: source.RAG_ENABLED === "false" ? "" : requireValue(source, "S3_ACCESS_KEY_ID"),
    s3SecretAccessKey: source.RAG_ENABLED === "false" ? "" : requireValue(source, "S3_SECRET_ACCESS_KEY"),
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
      config.redisUrl,
      config.weaviateApiKey,
      config.s3AccessKeyId,
      config.s3SecretAccessKey,
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
