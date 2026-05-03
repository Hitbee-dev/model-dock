import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { createCloudflareAccessVerifier, hashPassword } from "@modeldock/auth";
import { createMemoryAuthStore } from "./auth-store.js";
import { createApiHandler } from "./http.js";
import { createPostgresAuthStoreFromEnv } from "./postgres-auth-store.js";
import { createRegistrationStoreFromEnv } from "./postgres.js";
import { createMemoryRagDocumentStore, createRagDocumentStoreFromEnv } from "./rag-documents.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createMemoryRegistrationStore } from "./registrations.js";

function runCliStatus(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ exitCode: number; stderr: string; stdout: string }>((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error && "code" in error && error.code === "ENOENT") {
        reject(error);
        return;
      }
      resolve({
        exitCode: typeof error?.code === "number" ? error.code : 0,
        stderr,
        stdout
      });
    });
  });
}

const port = Number(process.env.PORT ?? 3002);
const host = process.env.HOST ?? "127.0.0.1";
const accessMode =
  process.env.MODELDOCK_ACCESS_MODE === "debug" || process.env.MODELDOCK_ACCESS_MODE === "release"
    ? process.env.MODELDOCK_ACCESS_MODE
    : process.env.NODE_ENV === "production"
      ? "release"
      : "debug";

const registrations = await createRegistrationStoreFromEnv({
  databaseUrl: process.env.DATABASE_URL,
  fallback: createMemoryRegistrationStore(),
  nodeEnv: process.env.NODE_ENV
});

const authStore = await createPostgresAuthStoreFromEnv({
  databaseUrl: process.env.DATABASE_URL,
  fallback: createMemoryAuthStore(),
  nodeEnv: process.env.NODE_ENV
});
if (accessMode === "debug") {
  await authStore.ensureDebugAdmin?.({
    email: process.env.MODELDOCK_DEBUG_ADMIN_EMAIL ?? "admin",
    passwordHash: hashPassword({
      password: process.env.MODELDOCK_DEBUG_ADMIN_PASSWORD ?? "admin",
      unsafeAllowShortPassword: true
    })
  });
}
const ragDocumentStore = await createRagDocumentStoreFromEnv({
  databaseUrl: process.env.DATABASE_URL,
  fallback: createMemoryRagDocumentStore(),
  nodeEnv: process.env.NODE_ENV
});

const cloudflareAccessConfig = {
  enabled: process.env.CLOUDFLARE_ACCESS_ENABLED === "true",
  teamDomain: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ?? "",
  allowedAudiences: (process.env.CLOUDFLARE_ACCESS_ALLOWED_AUDIENCES ?? "").split(",").filter(Boolean),
  allowedEmails: (process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS ?? "").split(",").filter(Boolean)
};

async function* responseTextChunks(response: Response): AsyncIterable<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    yield decoder.decode(value, { stream: true });
  }
}

const server = createServer(
  createApiHandler({
    accessMode,
    adminAppUrl: process.env.ADMIN_APP_URL ?? "http://127.0.0.1:3001",
    adminApiToken: process.env.ADMIN_API_TOKEN,
    authStore,
    cloudflareAccessConfig,
    cloudflareAccessVerifier: cloudflareAccessConfig.enabled
      ? createCloudflareAccessVerifier({
          teamDomain: cloudflareAccessConfig.teamDomain,
          fetch: async (url: string) => fetch(url)
        })
      : undefined,
    chatCompletionFetch: async (url, init) => {
      const response = await fetch(url, init);
      return {
        ok: response.ok,
        status: response.status,
        body: responseTextChunks(response)
      };
    },
    litellmBaseUrl: process.env.LITELLM_BASE_URL,
    litellmMasterKey: process.env.LITELLM_MASTER_KEY,
    providerValidationFetch: async (url, init) => fetch(url, init),
    ragDocumentStore,
    rateLimiter: createMemoryRateLimiter(),
    registrations,
    secureCookies: process.env.NODE_ENV === "production",
    sessionSecret: process.env.SESSION_SECRET,
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7),
    subscriptionRuntimeConfig: {
      codexCommand: process.env.MODELDOCK_CODEX_COMMAND,
      claudeCommand: process.env.MODELDOCK_CLAUDE_COMMAND,
      experimentalChatGPTSubscription: process.env.EXPERIMENTAL_CHATGPT_SUBSCRIPTION === "true",
      experimentalClaudeSubscription: process.env.EXPERIMENTAL_CLAUDE_SUBSCRIPTION === "true",
      experimentalSubscriptionOAuth: process.env.EXPERIMENTAL_SUBSCRIPTION_OAUTH === "true"
    },
    subscriptionRuntimeRunner: runCliStatus
  })
);

server.listen(port, host, () => {
  console.log(`modeldock-api listening on http://${host}:${port}`);
});
