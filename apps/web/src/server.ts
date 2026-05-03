import { createServer } from "node:http";
import { resolveLocaleFromHeaders } from "@modeldock/ui";
import {
  renderChatPage,
  renderCredentialSetupPage,
  renderHomePage,
  renderProviderSettingsPage,
  renderSignupPage
} from "./pages.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const apiUrl = process.env.PUBLIC_API_URL ?? "http://127.0.0.1:3002";

const server = createServer((request, response) => {
  const locale = resolveLocaleFromHeaders(request.headers);
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "modeldock-web", status: "ok" }));
    return;
  }

  if (request.url === "/signup") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderSignupPage(apiUrl, locale));
    return;
  }

  if (request.url?.startsWith("/setup")) {
    const url = new URL(request.url, "http://127.0.0.1");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      renderCredentialSetupPage({
        apiUrl,
        email: url.searchParams.get("email") ?? "",
        locale,
        setupToken: url.searchParams.get("token") ?? ""
      })
    );
    return;
  }

  if (request.url === "/providers") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderProviderSettingsPage(apiUrl, locale));
    return;
  }

  if (request.url === "/chat") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderChatPage(apiUrl, locale));
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderHomePage(locale));
});

server.listen(port, host, () => {
  console.log(`modeldock-web listening on http://${host}:${port}`);
});
