import type { MessageDraft } from "./domain.js";

export type ChatStreamEvent =
  | { type: "status"; status: "working" | "calling_tool" | "reviewing_result"; label: string }
  | { type: "token"; content: string }
  | { type: "reasoning_summary"; summary: string }
  | { type: "done"; finishReason?: string }
  | { type: "error"; message: string };

type OpenAICompatibleChunk = {
  choices: Array<{
    finish_reason?: string | null;
    delta?: {
      content?: unknown;
      reasoning?: unknown;
      reasoning_content?: unknown;
      tool_calls?: unknown;
    };
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseChunk(value: string): OpenAICompatibleChunk | undefined {
  const parsed = JSON.parse(value) as unknown;
  const record = asRecord(parsed);
  if (!record || !Array.isArray(record.choices)) {
    return undefined;
  }

  return parsed as OpenAICompatibleChunk;
}

export function parseOpenAICompatibleSseLine(line: string): ChatStreamEvent[] {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) {
    return [];
  }
  if (!trimmed.startsWith("data:")) {
    return [{ type: "error", message: "Unsupported stream frame." }];
  }

  const payload = trimmed.slice("data:".length).trim();
  if (payload === "[DONE]") {
    return [{ type: "done" }];
  }

  try {
    const chunk = parseChunk(payload);
    if (!chunk) {
      return [];
    }

    return chunk.choices.flatMap((choice) => {
      const events: ChatStreamEvent[] = [];
      const token = asString(choice.delta?.content);
      if (token) {
        events.push({ type: "token", content: token });
      }
      if (choice.delta?.tool_calls !== undefined) {
        events.push({ type: "status", status: "calling_tool", label: "Calling tool..." });
      }
      if (choice.finish_reason) {
        events.push({ type: "done", finishReason: choice.finish_reason });
      }
      return events;
    });
  } catch {
    return [{ type: "error", message: "Malformed stream frame." }];
  }
}

export function appendAssistantStreamEvent(draft: MessageDraft, event: ChatStreamEvent): MessageDraft {
  if (draft.role !== "assistant") {
    throw new Error("Only assistant drafts can receive assistant stream events.");
  }
  if (event.type !== "token") {
    return draft;
  }

  return {
    ...draft,
    content: `${draft.content}${event.content}`
  };
}
