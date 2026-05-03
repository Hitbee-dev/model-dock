import { escapeAttribute, renderActionLink, renderIcon, renderShell, type SupportedLocale } from "@modeldock/ui";

export const localOnlyChatWarning =
  "Local-only chats stay in this browser and are not available on other devices. Export them before clearing browser data.";

const homeCopy: Record<SupportedLocale, { eyebrow: string; title: string; body: string; chat: string; providers: string; signup: string }> = {
  en: {
    eyebrow: "LiteLLM-first control plane",
    title: "Dock providers, budgets, and chats into one private service.",
    body: "ModelDock gives operators a secure baseline for multi-user LLM apps with BYOK, credits, admin approvals, and calm chat workflows.",
    chat: "Open chat",
    providers: "Provider settings",
    signup: "Request access"
  },
  ko: {
    eyebrow: "LiteLLM 우선 컨트롤 플레인",
    title: "공급자, 예산, 채팅을 하나의 비공개 서비스로 묶습니다.",
    body: "ModelDock은 BYOK, 크레딧, 관리자 승인, 차분한 채팅 흐름을 갖춘 다중 사용자 LLM 앱의 안전한 기준선입니다.",
    chat: "채팅 열기",
    providers: "공급자 설정",
    signup: "접근 요청"
  },
  zh: {
    eyebrow: "LiteLLM 优先控制平面",
    title: "把提供方、预算和聊天停靠到一个私有服务。",
    body: "ModelDock 为多用户 LLM 应用提供 BYOK、额度、管理员审批和稳健聊天流程。",
    chat: "打开聊天",
    providers: "提供方设置",
    signup: "请求访问"
  },
  ja: {
    eyebrow: "LiteLLM ファーストの制御面",
    title: "プロバイダー、予算、チャットを一つの非公開サービスに集約します。",
    body: "ModelDock は BYOK、クレジット、管理者承認、落ち着いたチャット体験を備えた基盤です。",
    chat: "チャットを開く",
    providers: "プロバイダー設定",
    signup: "アクセス申請"
  },
  es: {
    eyebrow: "Plano de control con LiteLLM primero",
    title: "Une proveedores, presupuestos y chats en un servicio privado.",
    body: "ModelDock ofrece BYOK, creditos, aprobaciones administrativas y flujos de chat sobrios.",
    chat: "Abrir chat",
    providers: "Proveedores",
    signup: "Solicitar acceso"
  },
  vi: {
    eyebrow: "Mat phang dieu khien uu tien LiteLLM",
    title: "Gom nha cung cap, ngan sach va chat vao mot dich vu rieng.",
    body: "ModelDock cung cap BYOK, tin dung, phe duyet quan tri va luong chat gon gang.",
    chat: "Mo chat",
    providers: "Cau hinh nha cung cap",
    signup: "Yeu cau truy cap"
  },
  pt: {
    eyebrow: "Plano de controle com LiteLLM primeiro",
    title: "Una provedores, orcamentos e chats em um servico privado.",
    body: "ModelDock oferece BYOK, creditos, aprovacoes administrativas e fluxos de chat discretos.",
    chat: "Abrir chat",
    providers: "Provedores",
    signup: "Solicitar acesso"
  }
};

export function renderSignupPage(apiUrl: string, locale: SupportedLocale = "en"): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  const copy = homeCopy[locale];
  return renderShell({
    title: "ModelDock signup",
    surface: "web",
    activePath: "/signup",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${copy.signup}</p>
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

export function renderCredentialSetupPage(input: {
  apiUrl: string;
  email: string;
  locale?: SupportedLocale;
  setupToken: string;
}): string {
  const locale = input.locale ?? "en";
  const escapedApiUrl = escapeAttribute(input.apiUrl);
  return renderShell({
    title: "ModelDock account setup",
    surface: "web",
    activePath: "/signup",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Approved access</p>
      <h1>Set your password to finish account setup.</h1>
      <p>Your administrator approved the request. This setup token is single use and expires soon.</p>
    </div>
    <form class="form-panel" id="credential-setup-form" data-api-url="${escapedApiUrl}">
      <input type="hidden" name="setupToken" value="${escapeAttribute(input.setupToken)}">
      <label>Email <input type="email" name="email" autocomplete="email" value="${escapeAttribute(input.email)}" required></label>
      <label>Password <input type="password" name="password" autocomplete="new-password" required></label>
      <label>Confirm password <input type="password" name="passwordConfirmation" autocomplete="new-password" required></label>
      <button type="submit">${renderIcon("key")}<span>Finish setup</span></button>
      <p id="credential-setup-result" role="status">Use the setup link from your administrator.</p>
    </form>
  </section>
  <script>
    const form = document.getElementById("credential-setup-form");
    const result = document.getElementById("credential-setup-result");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.textContent = "Saving credentials...";
      const data = new FormData(form);
      const response = await fetch(form.dataset.apiUrl + "/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          passwordConfirmation: data.get("passwordConfirmation"),
          setupToken: data.get("setupToken")
        })
      });
      result.textContent = response.ok ? "Account setup complete. You can sign in when login is enabled." : "Setup failed or the token expired.";
      if (response.ok) form.reset();
    });
  </script>
</main>`
  });
}

export function renderProviderSettingsPage(apiUrl: string, locale: SupportedLocale = "en"): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock providers",
    surface: "web",
    activePath: "/providers",
    locale,
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

export function renderChatPage(apiUrl: string, locale: SupportedLocale = "en"): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock chat",
    surface: "web",
    activePath: "/chat",
    locale,
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

export function renderHomePage(locale: SupportedLocale = "en"): string {
  const copy = homeCopy[locale];
  return renderShell({
    title: "ModelDock",
    surface: "web",
    activePath: "/",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1>${copy.title}</h1>
      <p>${copy.body}</p>
      <div class="actions">
        ${renderActionLink("/chat", copy.chat, "chat")}
        ${renderActionLink("/providers", copy.providers, "key")}
        ${renderActionLink("/signup", copy.signup, "approvals")}
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
