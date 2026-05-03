export function assertServerRuntime(): void {
  if (typeof (globalThis as { window?: unknown }).window !== "undefined") {
    throw new Error("LiteLLM secret-bearing helpers can only run on the server.");
  }
}

export function createLiteLLMHeaders(masterKey: string): Record<string, string> {
  assertServerRuntime();
  return {
    authorization: `Bearer ${masterKey}`,
    "content-type": "application/json"
  };
}
