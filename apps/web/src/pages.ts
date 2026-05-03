function htmlPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export const localOnlyChatWarning =
  "Local-only chats stay in this browser and are not available on other devices. Export them before clearing browser data.";

export function renderSignupPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return htmlPage(
    "ModelDock signup",
    `<main>
  <h1>Request access</h1>
  <form method="post" action="${escapedApiUrl}/auth/signup">
    <label>Email <input type="email" name="email" autocomplete="email" required></label>
    <label>Name <input type="text" name="displayName" autocomplete="name"></label>
    <button type="submit">Request approval</button>
  </form>
</main>`
  );
}

export function renderProviderSettingsPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return htmlPage(
    "ModelDock providers",
    `<main>
  <h1>Provider settings</h1>
  <form id="provider-validation-form" data-api-url="${escapedApiUrl}">
    <label>Provider
      <select name="provider" required>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="gemini">Gemini</option>
        <option value="openrouter">OpenRouter</option>
        <option value="ollama">Ollama</option>
        <option value="vllm">vLLM</option>
        <option value="custom">OpenAI-compatible</option>
      </select>
    </label>
    <label>Endpoint <input type="url" name="endpoint" placeholder="https://api.example.com/v1/models"></label>
    <label>API key <input type="password" name="apiKey" autocomplete="off" required></label>
    <button type="submit">Validate connection</button>
  </form>
  <p id="provider-validation-result" role="status">Provider keys are validated server-side and never shown again.</p>
  <script>
    const form = document.getElementById("provider-validation-form");
    const result = document.getElementById("provider-validation-result");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.textContent = "Validating connection...";
      const data = new FormData(form);
      const response = await fetch(form.dataset.apiUrl + "/providers/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: data.get("provider"),
          endpoint: data.get("endpoint"),
          apiKey: data.get("apiKey")
        })
      });
      result.textContent = response.ok ? "Connection validated." : "Connection validation failed.";
      form.reset();
    });
  </script>
</main>`
  );
}

export function renderChatPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return htmlPage(
    "ModelDock chat",
    `<main>
  <h1>Chat</h1>
  <form id="chat-form" data-api-url="${escapedApiUrl}">
    <label>Message <textarea name="message" rows="4" required></textarea></label>
    <button type="submit">Send</button>
  </form>
  <p id="chat-status" role="status">Working...</p>
  <article id="assistant-message" aria-live="polite"></article>
  <details id="reasoning-details" hidden>
    <summary>Reasoning summary</summary>
    <p id="reasoning-summary"></p>
  </details>
  <script>
    const chatForm = document.getElementById("chat-form");
    const chatStatus = document.getElementById("chat-status");
    const assistantMessage = document.getElementById("assistant-message");
    const reasoningDetails = document.getElementById("reasoning-details");
    const reasoningSummary = document.getElementById("reasoning-summary");

    function applyStreamEvent(event) {
      if (event.type === "token") {
        assistantMessage.textContent += event.content;
      }
      if (event.type === "reasoning_summary" && typeof event.summary === "string") {
        reasoningSummary.textContent = event.summary;
        reasoningDetails.hidden = false;
      }
      if (event.type === "status") {
        chatStatus.textContent = event.label;
      }
      if (event.type === "done") {
        chatStatus.textContent = "Complete.";
      }
      if (event.type === "error") {
        chatStatus.textContent = "Response failed.";
      }
    }

    chatForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(chatForm);
      chatStatus.textContent = "Working...";
      assistantMessage.textContent = "";
      reasoningSummary.textContent = "";
      reasoningDetails.hidden = true;
      const response = await fetch(chatForm.dataset.apiUrl + "/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: [{ role: "user", content: data.get("message") }] })
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\\n\\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\\n").find((part) => part.startsWith("data:"));
          if (line) applyStreamEvent(JSON.parse(line.slice(5).trim()));
        }
      }
    });
  </script>
</main>`
  );
}

export function renderHomePage(): string {
  return htmlPage(
    "ModelDock",
    `<main>
  <h1>ModelDock</h1>
  <p>Self-hosted LLM service control plane.</p>
  <section aria-labelledby="local-only-chat">
    <h2 id="local-only-chat">Local-only chat mode</h2>
    <p>${localOnlyChatWarning}</p>
    <button type="button">Use local-only storage</button>
  </section>
  <a href="/signup">Request access</a>
  <a href="/providers">Provider settings</a>
  <a href="/chat">Chat</a>
</main>`
  );
}
