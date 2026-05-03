import { listLiteLLMSpendRecords, type LiteLLMSpendRecord, type LiteLLMSpendSyncCursor } from "./spend.js";
import type { LiteLLMClientOptions } from "./index.js";

export type LiteLLMSpendLedgerEntry = {
  userId: string;
  amountUsd: number;
  source: "litellm_spend";
  externalId: string;
  createdAt: string;
};

export type LiteLLMSpendLedgerWriter = {
  hasSpendExternalId(externalId: string): Promise<boolean>;
  recordSpend(entry: LiteLLMSpendLedgerEntry): Promise<void>;
};

export type LiteLLMSpendSyncResult = {
  fetched: number;
  recorded: number;
  skipped: number;
  nextCursor?: LiteLLMSpendSyncCursor;
};

function toLedgerEntry(record: LiteLLMSpendRecord): LiteLLMSpendLedgerEntry {
  return {
    userId: record.userId,
    amountUsd: -record.spendUsd,
    source: "litellm_spend",
    externalId: record.externalId,
    createdAt: record.occurredAt
  };
}

export async function syncLiteLLMSpend(input: {
  clientOptions: LiteLLMClientOptions;
  ledger: LiteLLMSpendLedgerWriter;
  cursor?: LiteLLMSpendSyncCursor;
}): Promise<LiteLLMSpendSyncResult> {
  const records = await listLiteLLMSpendRecords(input.clientOptions, input.cursor);
  let recorded = 0;
  let skipped = 0;

  for (const record of records) {
    if (await input.ledger.hasSpendExternalId(record.externalId)) {
      skipped += 1;
      continue;
    }

    await input.ledger.recordSpend(toLedgerEntry(record));
    recorded += 1;
  }

  const lastRecord = records.at(-1);
  return {
    fetched: records.length,
    recorded,
    skipped,
    nextCursor: lastRecord ? { requestId: lastRecord.externalId } : input.cursor
  };
}
