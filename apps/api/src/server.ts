import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3002);
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "modeldock-api", status: "ok" }));
    return;
  }

  if (request.url?.startsWith("/admin")) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "admin_api_requires_dedicated_admin_host" }));
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ service: "modeldock-api", status: "placeholder" }));
});

server.listen(port, host, () => {
  console.log(`modeldock-api listening on http://${host}:${port}`);
});
