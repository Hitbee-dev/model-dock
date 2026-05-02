import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const adminUrl = process.env.ADMIN_APP_URL ?? "http://127.0.0.1:3001";

const server = createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "modeldock-admin", status: "ok" }));
    return;
  }

  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end(`ModelDock admin placeholder. Production admin host: ${adminUrl}\n`);
});

server.listen(port, host, () => {
  console.log(`modeldock-admin listening on http://${host}:${port}`);
});
