import { createServer } from "node:http";
import { renderApprovalsPage } from "./pages.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const adminUrl = process.env.ADMIN_APP_URL ?? "http://127.0.0.1:3001";
const apiUrl = process.env.PUBLIC_API_URL ?? "http://127.0.0.1:3002";

const server = createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "modeldock-admin", status: "ok" }));
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderApprovalsPage(apiUrl));
});

server.listen(port, host, () => {
  console.log(`modeldock-admin listening on http://${host}:${port}`);
});
