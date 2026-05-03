import { createServer } from "node:http";
import { createCloudflareAccessVerifier } from "@modeldock/auth";
import { createMemoryAuthStore } from "./auth-store.js";
import { createApiHandler } from "./http.js";
import { createPostgresAuthStoreFromEnv } from "./postgres-auth-store.js";
import { createRegistrationStoreFromEnv } from "./postgres.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createMemoryRegistrationStore } from "./registrations.js";

const port = Number(process.env.PORT ?? 3002);
const host = process.env.HOST ?? "127.0.0.1";

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

const cloudflareAccessConfig = {
  enabled: process.env.CLOUDFLARE_ACCESS_ENABLED === "true",
  teamDomain: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ?? "",
  allowedAudiences: (process.env.CLOUDFLARE_ACCESS_ALLOWED_AUDIENCES ?? "").split(",").filter(Boolean),
  allowedEmails: (process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS ?? "").split(",").filter(Boolean)
};

const server = createServer(
  createApiHandler({
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
    providerValidationFetch: async (url, init) => fetch(url, init),
    rateLimiter: createMemoryRateLimiter(),
    registrations,
    secureCookies: process.env.NODE_ENV === "production",
    sessionSecret: process.env.SESSION_SECRET,
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7)
  })
);

server.listen(port, host, () => {
  console.log(`modeldock-api listening on http://${host}:${port}`);
});
