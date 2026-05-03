import {
  escapeAttribute,
  escapeHtml,
  renderIcon,
  renderShell,
  type SupportedLocale
} from "@modeldock/ui";
import type { SubscriptionRuntimeProbe } from "@modeldock/byok";
import type { AccessRuleSnapshot } from "./access.js";

export type PendingApproval = {
  id: string;
  email: string;
  displayName?: string;
  requestedAt: string;
};

type AdminCopy = {
  protectedHost: string;
  loginTitle: string;
  loginBody: string;
  setupTitle: string;
  setupBody: string;
  approvalsTitle: string;
  approvalsBody: string;
  runtimesTitle: string;
  runtimesBody: string;
  settingsTitle: string;
  settingsBody: string;
};

const copy: Record<SupportedLocale, AdminCopy> = {
  en: {
    protectedHost: "Protected admin host",
    loginTitle: "Sign in to the admin surface.",
    loginBody: "Debug mode starts with admin/admin and requires a credential change after the first sign-in.",
    setupTitle: "Change the default admin credentials.",
    setupBody: "Use a real email or operator ID and a password of at least 12 characters.",
    approvalsTitle: "Review signup requests.",
    approvalsBody: "Users can sign in only after an administrator approves their registration.",
    runtimesTitle: "Experimental local subscription runtimes.",
    runtimesBody: "Check host CLI login state without storing OAuth tokens in ModelDock.",
    settingsTitle: "Admin access allowlist.",
    settingsBody: "Access is allowed when either the request IP or registered device fingerprint matches."
  },
  ko: {
    protectedHost: "보호된 관리자 호스트",
    loginTitle: "관리자 화면에 로그인하세요.",
    loginBody: "debug mode는 admin/admin으로 시작하고 첫 로그인 후 자격 증명 변경을 요구합니다.",
    setupTitle: "기본 관리자 자격 증명을 변경하세요.",
    setupBody: "실제 이메일 또는 운영자 ID와 12자 이상의 비밀번호를 사용하세요.",
    approvalsTitle: "회원가입 요청을 검토하세요.",
    approvalsBody: "사용자는 관리자가 가입 요청을 승인한 뒤에만 로그인할 수 있습니다.",
    runtimesTitle: "실험적 로컬 구독 런타임.",
    runtimesBody: "ModelDock에 OAuth 토큰을 저장하지 않고 호스트 CLI 로그인 상태만 확인합니다.",
    settingsTitle: "관리자 접근 허용 목록.",
    settingsBody: "요청 IP 또는 등록된 디바이스 fingerprint 중 하나가 맞으면 접근을 허용합니다."
  },
  zh: {
    protectedHost: "受保护的管理主机",
    loginTitle: "登录管理界面。",
    loginBody: "调试模式从 admin/admin 开始，首次登录后必须更改凭据。",
    setupTitle: "更改默认管理员凭据。",
    setupBody: "使用真实邮箱或操作员 ID，以及至少 12 个字符的密码。",
    approvalsTitle: "审核注册请求。",
    approvalsBody: "只有管理员批准后，用户才能登录。",
    runtimesTitle: "实验性本地订阅运行时。",
    runtimesBody: "只检查主机 CLI 登录状态，不在 ModelDock 中存储 OAuth 令牌。",
    settingsTitle: "管理员访问白名单。",
    settingsBody: "请求 IP 或已登记设备 fingerprint 任一匹配即可访问。"
  },
  ja: {
    protectedHost: "保護された管理ホスト",
    loginTitle: "管理画面にサインインします。",
    loginBody: "debug mode は admin/admin で開始し、初回サインイン後に変更が必要です。",
    setupTitle: "既定の管理者認証情報を変更します。",
    setupBody: "実際のメールまたは運用 ID と 12 文字以上のパスワードを使ってください。",
    approvalsTitle: "登録リクエストを確認します。",
    approvalsBody: "ユーザーは管理者が承認した後にのみサインインできます。",
    runtimesTitle: "実験的なローカル subscription runtime。",
    runtimesBody: "ModelDock に OAuth トークンを保存せず、ホスト CLI のログイン状態だけ確認します。",
    settingsTitle: "管理者アクセス許可リスト。",
    settingsBody: "リクエスト IP または登録済み device fingerprint の片方が一致すれば許可します。"
  },
  es: {
    protectedHost: "Host administrativo protegido",
    loginTitle: "Inicia sesion en administracion.",
    loginBody: "Debug mode empieza con admin/admin y exige cambiar credenciales.",
    setupTitle: "Cambia las credenciales iniciales.",
    setupBody: "Usa un correo o ID real y una contrasena de al menos 12 caracteres.",
    approvalsTitle: "Revisa solicitudes de registro.",
    approvalsBody: "Los usuarios solo entran despues de la aprobacion administrativa.",
    runtimesTitle: "Runtimes locales experimentales.",
    runtimesBody: "Comprueba el login del CLI sin guardar tokens OAuth en ModelDock.",
    settingsTitle: "Lista permitida de administracion.",
    settingsBody: "Se permite el acceso si coincide la IP o el fingerprint registrado."
  },
  vi: {
    protectedHost: "May quan tri duoc bao ve",
    loginTitle: "Dang nhap trang quan tri.",
    loginBody: "Debug mode bat dau voi admin/admin va bat buoc doi thong tin dang nhap.",
    setupTitle: "Doi thong tin quan tri mac dinh.",
    setupBody: "Dung email hoac ID that va mat khau it nhat 12 ky tu.",
    approvalsTitle: "Duyet yeu cau dang ky.",
    approvalsBody: "Nguoi dung chi dang nhap duoc sau khi quan tri vien phe duyet.",
    runtimesTitle: "Runtime local thu nghiem.",
    runtimesBody: "Kiem tra dang nhap CLI may chu ma khong luu token OAuth trong ModelDock.",
    settingsTitle: "Danh sach cho phep quan tri.",
    settingsBody: "Cho phep khi IP hoac fingerprint da dang ky khop."
  },
  pt: {
    protectedHost: "Host administrativo protegido",
    loginTitle: "Entre na area administrativa.",
    loginBody: "Debug mode comeca com admin/admin e exige troca no primeiro acesso.",
    setupTitle: "Altere as credenciais iniciais.",
    setupBody: "Use email ou ID real e senha com pelo menos 12 caracteres.",
    approvalsTitle: "Revise solicitacoes de cadastro.",
    approvalsBody: "Usuarios so entram depois da aprovacao administrativa.",
    runtimesTitle: "Runtimes locais experimentais.",
    runtimesBody: "Verifica o login do CLI sem salvar tokens OAuth no ModelDock.",
    settingsTitle: "Lista permitida administrativa.",
    settingsBody: "O acesso e permitido se o IP ou fingerprint registrado corresponder."
  }
};

function text(locale: SupportedLocale): AdminCopy {
  return copy[locale] ?? copy.en;
}

export function renderLoginPage(locale: SupportedLocale = "en", error?: string): string {
  const t = text(locale);
  return renderShell({
    title: "ModelDock Admin login",
    surface: "admin",
    activePath: "/",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${escapeHtml(t.protectedHost)}</p>
      <h1>${escapeHtml(t.loginTitle)}</h1>
      <p>${escapeHtml(t.loginBody)}</p>
      ${error ? `<p class="notice">${escapeHtml(error)}</p>` : ""}
    </div>
    <form class="form-panel" method="post" action="/login">
      <label>ID or email <input name="email" autocomplete="username" value="admin" required></label>
      <label>Password <input type="password" name="password" autocomplete="current-password" value="admin" required></label>
      <button type="submit">${renderIcon("security")}<span>Sign in</span></button>
    </form>
  </section>
</main>`
  });
}

export function renderSetupAccountPage(input: { csrfToken?: string; error?: string; locale?: SupportedLocale } = {}): string {
  const locale = input.locale ?? "en";
  const t = text(locale);
  return renderShell({
    title: "ModelDock Admin setup",
    surface: "admin",
    activePath: "/settings",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${escapeHtml(t.protectedHost)}</p>
      <h1>${escapeHtml(t.setupTitle)}</h1>
      <p>${escapeHtml(t.setupBody)}</p>
      ${input.error ? `<p class="notice">${escapeHtml(input.error)}</p>` : ""}
    </div>
    <form class="form-panel" method="post" action="/setup-account">
      <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
      <label>ID or email <input name="email" autocomplete="username" required></label>
      <label>Current password <input type="password" name="currentPassword" autocomplete="current-password"></label>
      <label>New password <input type="password" name="password" autocomplete="new-password" required></label>
      <label>Confirm password <input type="password" name="passwordConfirmation" autocomplete="new-password" required></label>
      <button type="submit">${renderIcon("key")}<span>Save credentials</span></button>
      <a class="action-link secondary" href="/">${renderIcon("terminal")}<span>Cancel for now</span></a>
    </form>
  </section>
</main>`
  });
}

export function renderApprovalsPage(input: {
  approvals: PendingApproval[];
  csrfToken?: string;
  locale?: SupportedLocale;
  needsLogin?: boolean;
}): string {
  const locale = input.locale ?? "en";
  const t = text(locale);
  const rows = input.approvals.length
    ? input.approvals
        .map(
          (approval) => `<div class="chat-item">
        <strong>${escapeHtml(approval.email)}</strong>
        <p>${escapeHtml(approval.displayName ?? "No display name")} · ${escapeHtml(approval.requestedAt)}</p>
        <form method="post" action="/approvals/${escapeAttribute(approval.id)}/approve">
          <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
          <button type="submit">${renderIcon("approvals")}<span>Approve</span></button>
        </form>
      </div>`
        )
        .join("")
    : `<p>No pending requests.</p>`;

  return renderShell({
    title: "ModelDock approvals",
    surface: "admin",
    activePath: "/",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${escapeHtml(t.protectedHost)}</p>
      <h1>${escapeHtml(t.approvalsTitle)}</h1>
      <p>${escapeHtml(t.approvalsBody)}</p>
      <div class="actions">
        <a class="action-link" href="/settings">${renderIcon("security")}<span>Access settings</span></a>
        <a class="action-link secondary" href="/setup-account">${renderIcon("key")}<span>Change account</span></a>
      </div>
    </div>
    <section class="form-panel">
      <h2>Pending approvals</h2>
      ${input.needsLogin ? `<p class="notice">Sign in to manage requests.</p>` : rows}
    </section>
  </section>
</main>`
  });
}

export function renderAccessSettingsPage(input: {
  csrfToken?: string;
  snapshot: AccessRuleSnapshot;
  locale?: SupportedLocale;
}): string {
  const locale = input.locale ?? "en";
  const t = text(locale);
  const renderList = (kind: "ip" | "mac", values: string[]) =>
    values.length
      ? values
          .map(
            (value) => `<form class="inline-form" method="post" action="/settings/access-rules/delete">
        <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
        <input type="hidden" name="kind" value="${kind}">
        <input type="hidden" name="value" value="${escapeAttribute(value)}">
        <span>${escapeHtml(value)}</span>
        <button class="secondary" type="submit">${renderIcon("check")}<span>Delete</span></button>
      </form>`
          )
          .join("")
      : `<p>No ${kind.toUpperCase()} rules configured.</p>`;

  return renderShell({
    title: "ModelDock admin settings",
    surface: "admin",
    activePath: "/settings",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">${escapeHtml(input.snapshot.mode)} mode</p>
      <h1>${escapeHtml(t.settingsTitle)}</h1>
      <p>${escapeHtml(t.settingsBody)}</p>
    </div>
    <form class="form-panel" method="post" action="/settings/access-rules">
      <h2>Add rule</h2>
      <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
      <label>Type
        <select name="kind">
          <option value="ip">IP address</option>
          <option value="mac">Device fingerprint</option>
        </select>
      </label>
      <label>Value <input name="value" required></label>
      <button type="submit">${renderIcon("security")}<span>Add allow rule</span></button>
    </form>
  </section>
  <section class="grid">
    <div class="panel"><h2>Allowed IPs</h2>${renderList("ip", input.snapshot.allowedIps)}</div>
    <div class="panel"><h2>Allowed devices</h2>${renderList("mac", input.snapshot.allowedMacs)}</div>
    <div class="panel"><h2>Detected service host</h2>
      <p>IPs: ${escapeHtml(input.snapshot.detectedIps.join(", ") || "none")}</p>
      <p>MACs: ${escapeHtml(input.snapshot.detectedMacs.join(", ") || "none")}</p>
    </div>
  </section>
</main>`
  });
}

export function renderSubscriptionRuntimesPage(input: {
  locale?: SupportedLocale;
  needsLogin?: boolean;
  runtimes: SubscriptionRuntimeProbe[];
  warning?: string;
}): string {
  const locale = input.locale ?? "en";
  const t = text(locale);
  const rows = input.runtimes.length
    ? input.runtimes
        .map(
          (runtime) => `<div class="chat-item">
        <strong>${escapeHtml(runtime.displayName)}</strong>
        <p>${escapeHtml(runtime.status)} · ${escapeHtml(runtime.message)}</p>
        <p>Command: <code>${escapeHtml(runtime.command)}</code> · Login: <code>${escapeHtml(runtime.loginHint)}</code></p>
        <p>${escapeHtml(runtime.termsWarning)}</p>
      </div>`
        )
        .join("")
    : `<p>${input.warning ? escapeHtml(input.warning) : "No local runtimes configured."}</p>`;

  return renderShell({
    title: "ModelDock subscription runtimes",
    surface: "admin",
    activePath: "/subscription-runtimes",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Experimental</p>
      <h1>${escapeHtml(t.runtimesTitle)}</h1>
      <p>${escapeHtml(t.runtimesBody)}</p>
      <p class="notice">Do not use this to share one personal subscription across multiple users unless the provider explicitly allows it.</p>
    </div>
    <section class="form-panel">
      <h2>Runtime status</h2>
      ${input.needsLogin ? `<p class="notice">Sign in to inspect local runtimes.</p>` : rows}
    </section>
  </section>
</main>`
  });
}

export function renderInvitationPage(input: {
  email: string;
  expiresAt: string;
  locale?: SupportedLocale;
  setupUrl: string;
}): string {
  const locale = input.locale ?? "en";
  return renderShell({
    title: "ModelDock invitation",
    surface: "admin",
    activePath: "/",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Approved signup</p>
      <h1>Send this setup link to the approved user.</h1>
      <p>The user is not login-capable until they set a password. This setup link expires at ${escapeHtml(input.expiresAt)}.</p>
      <div class="actions">
        <a class="action-link" href="/">${renderIcon("approvals")}<span>Back to approvals</span></a>
      </div>
    </div>
    <section class="form-panel">
      <h2>${escapeHtml(input.email)}</h2>
      <label>Setup link <input readonly value="${escapeAttribute(input.setupUrl)}"></label>
      <p class="notice">Send through a private channel. Do not post setup links in public chat or issue trackers.</p>
    </section>
  </section>
</main>`
  });
}

export function renderForbiddenPage(locale: SupportedLocale = "en"): string {
  return renderShell({
    title: "ModelDock admin blocked",
    surface: "admin",
    activePath: "/settings",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Access blocked</p>
      <h1>This device or IP is not allowed for the admin surface.</h1>
      <p>Use the service host in debug mode or add this IP/device from an existing admin session.</p>
    </div>
  </section>
</main>`
  });
}
