import { escapeAttribute, renderActionLink, renderIcon, renderShell } from "@modeldock/ui";

export const localOnlyChatWarning =
  "Local-only chats stay in this browser and are not available on other devices. Export them before clearing browser data.";

export function renderSignupPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock signup",
    surface: "web",
    activePath: "/signup",
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Access control</p>
      <h1>Request access to the workspace.</h1>
      <p>Self-registration stays closed by default. An operator reviews each request from the protected admin surface.</p>
    </div>
    <form class="form-panel" method="post" action="${escapedApiUrl}/auth/signup">
      <label>Email <input type="email" name="email" autocomplete="email" required></label>
      <label>Name <input type="text" name="displayName" autocomplete="name"></label>
      <button type="submit">${renderIcon("approvals")}<span>Request approval</span></button>
    </form>
  </section>
</main>`
  });
}

export function renderProviderSettingsPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock providers",
    surface: "web",
    activePath: "/providers",
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">BYOK vault</p>
      <h1>Connect provider keys without exposing them.</h1>
      <p>ModelDock validates keys server-side, stores credentials in the vault, and never renders saved secrets back to the browser.</p>
      <div class="feature-list">
        <div class="feature">${renderIcon("security")}<p>Provider credentials stay separate from sessions, MCP secrets, and app secrets.</p></div>
        <div class="feature">${renderIcon("litellm")}<p>Routing remains mediated through the API and LiteLLM proxy.</p></div>
      </div>
    </div>
    <form class="form-panel" id="provider-validation-form" data-api-url="${escapedApiUrl}">
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
      <button type="submit">${renderIcon("key")}<span>Validate connection</span></button>
      <p id="provider-validation-result" role="status">Provider keys are validated server-side and never shown again.</p>
    </form>
  </section>
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
  });
}

export function renderChatPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock chat",
    surface: "web",
    activePath: "/chat",
    body: `<main class="page">
  <section class="chat-layout">
    <aside class="panel">
      <h2>Chats</h2>
      <div class="chat-list">
        <div class="chat-item"><strong>All chats</strong><p>Server-stored conversations across devices.</p></div>
        <div class="chat-item"><strong>Local-only</strong><p>${localOnlyChatWarning}</p></div>
      </div>
    </aside>
    <section class="form-panel">
      <p class="eyebrow">Conversation</p>
      <h1>Chat through governed LiteLLM routing.</h1>
      <form id="chat-form" data-api-url="${escapedApiUrl}">
        <label>Message <textarea name="message" rows="5" required></textarea></label>
        <button type="submit">${renderIcon("chat")}<span>Send</span></button>
      </form>
      <p id="chat-status" role="status">Working...</p>
      <article id="assistant-message" aria-live="polite"></article>
      <details id="reasoning-details" hidden>
        <summary>Reasoning summary</summary>
        <p id="reasoning-summary"></p>
      </details>
    </section>
  </section>
  <script>
    const chatForm = document.getElementById("chat-form");
    const chatStatus = document.getElementById("chat-status");
    const assistantMessage = document.getElementById("assistant-message");
    const reasoningDetails = document.getElementById("reasoning-details");
    const reasoningSummary = document.getElementById("reasoning-summary");

    function applyStreamEvent(event) {
      if (event.type === "token") assistantMessage.textContent += event.content;
      if (event.type === "reasoning_summary" && typeof event.summary === "string") {
        reasoningSummary.textContent = event.summary;
        reasoningDetails.hidden = false;
      }
      if (event.type === "status") chatStatus.textContent = event.label;
      if (event.type === "done") chatStatus.textContent = "Complete.";
      if (event.type === "error") chatStatus.textContent = "Response failed.";
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
  });
}

export function renderHomePage(): string {
  return renderShell({
    title: "ModelDock",
    surface: "web",
    activePath: "/",
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">LiteLLM-first control plane</p>
      <h1>Dock providers, budgets, and chats into one private service.</h1>
      <p>ModelDock gives operators a secure baseline for multi-user LLM apps with BYOK, credits, admin approvals, and calm chat workflows.</p>
      <div class="actions">
        ${renderActionLink("/chat", "Open chat", "chat")}
        ${renderActionLink("/providers", "Provider settings", "key")}
        ${renderActionLink("/signup", "Request access", "approvals")}
      </div>
    </div>
    <div class="panel">
      <h2>Local-only chat mode</h2>
      <p>${localOnlyChatWarning}</p>
      <button class="secondary" type="button">${renderIcon("database")}<span>Use local-only storage</span></button>
    </div>
  </section>
  <section class="grid" aria-label="ModelDock controls">
    <div class="metric">${renderIcon("security")}<span>Credential vault</span><strong>Encrypted</strong></div>
    <div class="metric">${renderIcon("budget")}<span>Credit policy</span><strong>Budgeted</strong></div>
    <div class="metric">${renderIcon("mcp")}<span>MCP and skills</span><strong>Permissioned</strong></div>
  </section>
</main>`
  });
}
