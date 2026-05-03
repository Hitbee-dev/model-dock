import { createServer } from "node:http";
import { createApiHandler } from "./http.js";
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

const server = createServer(
  createApiHandler({
    adminAppUrl: process.env.ADMIN_APP_URL ?? "http://127.0.0.1:3001",
    adminApiToken: process.env.ADMIN_API_TOKEN,
    providerValidationFetch: async (url, init) => fetch(url, init),
    rateLimiter: createMemoryRateLimiter(),
    registrations
  })
);

server.listen(port, host, () => {
  console.log(`modeldock-api listening on http://${host}:${port}`);
});
