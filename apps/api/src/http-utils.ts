import type { IncomingMessage, ServerResponse } from "node:http";

export async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > 16_384) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function readInput(request: IncomingMessage): Promise<Record<string, string>> {
  const raw = await readBody(request);
  if (request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  return JSON.parse(raw || "{}") as Record<string, string>;
}

export function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

export function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCookies(request: IncomingMessage): Map<string, string> {
  const cookies = new Map<string, string>();
  const raw = headerValue(request.headers.cookie);
  if (!raw) {
    return cookies;
  }

  for (const part of raw.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name) {
      cookies.set(name, valueParts.join("="));
    }
  }

  return cookies;
}
