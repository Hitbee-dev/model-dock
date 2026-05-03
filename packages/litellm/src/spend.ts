import { createLiteLLMHeaders } from "./headers.js";
import type { LiteLLMClientOptions } from "./index.js";

export type LiteLLMSpendLogRow = {
  request_id?: unknown;
  user?: unknown;
  user_id?: unknown;
  spend?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  model?: unknown;
  api_key?: unknown;
  messages?: unknown;
  response?: unknown;
};

export type LiteLLMSpendRecord = {
  externalId: string;
  userId: string;
  spendUsd: number;
  model?: string;
  occurredAt: string;
};

export type LiteLLMSpendSyncCursor = {
  requestId?: string;
  userId?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

function asIsoTime(value: unknown): string | undefined {
  const candidate = asString(value);
  if (!candidate) {
    return undefined;
  }
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

export function createSpendLogsUrl(baseUrl: string, cursor: LiteLLMSpendSyncCursor = {}): string {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/spend/logs`);
  if (cursor.requestId) {
    url.searchParams.set("request_id", cursor.requestId);
  }
  if (cursor.userId) {
    url.searchParams.set("user_id", cursor.userId);
  }

  return url.toString();
}

export function normalizeLiteLLMSpendRows(rows: LiteLLMSpendLogRow[]): LiteLLMSpendRecord[] {
  return rows.flatMap((row) => {
    const externalId = asString(row.request_id);
    const userId = asString(row.user) ?? asString(row.user_id);
    const spendUsd = asNonNegativeNumber(row.spend);
    const occurredAt = asIsoTime(row.endTime) ?? asIsoTime(row.startTime);
    if (!externalId || !userId || spendUsd === undefined || !occurredAt) {
      return [];
    }

    return [
      {
        externalId,
        userId,
        spendUsd,
        model: asString(row.model),
        occurredAt
      }
    ];
  });
}

export async function listLiteLLMSpendRecords(
  options: LiteLLMClientOptions,
  cursor: LiteLLMSpendSyncCursor = {}
): Promise<LiteLLMSpendRecord[]> {
  const response = await options.fetch(createSpendLogsUrl(options.baseUrl, cursor), {
    method: "GET",
    headers: createLiteLLMHeaders(options.masterKey)
  });
  if (!response.ok) {
    throw new Error(`LiteLLM spend log request failed with status ${response.status}.`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error("LiteLLM spend log response was not a list.");
  }

  return normalizeLiteLLMSpendRows(json as LiteLLMSpendLogRow[]);
}
