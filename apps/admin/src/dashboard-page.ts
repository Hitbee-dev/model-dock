import { escapeAttribute, escapeHtml, renderIcon, renderShell, type SupportedLocale } from "@modeldock/ui";
import type { PendingApproval } from "./pages.js";

export type AdminDashboardUser = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  status: "active" | "pending_approval" | "pending_setup";
  mustChangePassword: boolean;
  creditBalanceUsd: number;
  litellm: {
    budgetDuration?: string;
    litellmUserId?: string;
    maxBudgetUsd?: number;
    virtualKeyCount: number;
  };
};

export type AdminDashboardOverview = {
  gateway: {
    baseUrl?: string;
    configured: boolean;
    masterKeyConfigured: boolean;
    status: "not_configured" | "ready" | "unreachable" | "unhealthy";
    statusCode?: number;
  };
  pending: PendingApproval[];
  summary: {
    activeUsers: number;
    pendingApprovals: number;
    pendingSetup: number;
    totalCreditBalanceUsd: number;
  };
  users: AdminDashboardUser[];
};

type DashboardCopy = {
  body: string;
  gateway: string;
  pending: string;
  title: string;
  users: string;
};

const copy: Record<SupportedLocale, DashboardCopy> = {
  en: {
    body: "Manage signup approval, user credits, and LiteLLM gateway readiness from the protected admin host.",
    gateway: "LiteLLM gateway",
    pending: "Signup approvals",
    title: "ModelDock operations console.",
    users: "Users and credits"
  },
  ko: {
    body: "보호된 관리자 호스트에서 회원가입 승인, 유저 크레딧, LiteLLM gateway 상태를 관리합니다.",
    gateway: "LiteLLM gateway",
    pending: "회원가입 승인",
    title: "ModelDock 운영 콘솔.",
    users: "사용자와 크레딧"
  },
  zh: {
    body: "在受保护的管理主机中管理注册审批、用户额度和 LiteLLM 网关状态。",
    gateway: "LiteLLM 网关",
    pending: "注册审批",
    title: "ModelDock 运维控制台。",
    users: "用户和额度"
  },
  ja: {
    body: "保護された管理ホストで登録承認、ユーザークレジット、LiteLLM gateway 状態を管理します。",
    gateway: "LiteLLM gateway",
    pending: "登録承認",
    title: "ModelDock 運用コンソール。",
    users: "ユーザーとクレジット"
  },
  es: {
    body: "Gestiona aprobaciones, creditos y estado de LiteLLM desde el host administrativo protegido.",
    gateway: "Gateway LiteLLM",
    pending: "Aprobaciones",
    title: "Consola operativa de ModelDock.",
    users: "Usuarios y creditos"
  },
  vi: {
    body: "Quan ly phe duyet, credit nguoi dung va trang thai LiteLLM trong host quan tri duoc bao ve.",
    gateway: "Gateway LiteLLM",
    pending: "Phe duyet dang ky",
    title: "Bang dieu hanh ModelDock.",
    users: "Nguoi dung va credit"
  },
  pt: {
    body: "Gerencie aprovacoes, creditos e status do LiteLLM no host administrativo protegido.",
    gateway: "Gateway LiteLLM",
    pending: "Aprovacoes",
    title: "Console operacional do ModelDock.",
    users: "Usuarios e creditos"
  }
};

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function renderGateway(overview: AdminDashboardOverview): string {
  const configured = overview.gateway.configured ? "Configured" : "Not configured";
  const status = overview.gateway.statusCode
    ? `${overview.gateway.status} (${overview.gateway.statusCode})`
    : overview.gateway.status;
  return `<div class="panel">
    <h2>${renderIcon("litellm")}<span>LiteLLM</span></h2>
    <p><strong>${escapeHtml(status)}</strong></p>
    <p>${escapeHtml(configured)} · master key ${overview.gateway.masterKeyConfigured ? "set" : "missing"}</p>
    <p><code>${escapeHtml(overview.gateway.baseUrl ?? "LITELLM_BASE_URL not set")}</code></p>
  </div>`;
}

function renderApprovals(input: { approvals: PendingApproval[]; csrfToken?: string }): string {
  const rows = input.approvals.length
    ? input.approvals
        .map(
          (approval) => `<div class="chat-item">
      <strong>${escapeHtml(approval.email)}</strong>
      <p>${escapeHtml(approval.displayName ?? "No display name")} · ${escapeHtml(approval.requestedAt)}</p>
      <form method="post" action="/approvals/${escapeAttribute(approval.id)}/approve">
        <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
        <button type="submit">${renderIcon("approvals")}<span>Approve and invite</span></button>
      </form>
    </div>`
        )
        .join("")
    : "<p>No pending signup requests.</p>";
  return `<section class="panel"><h2>Pending approvals</h2>${rows}</section>`;
}

function renderUsers(input: { csrfToken?: string; users: AdminDashboardUser[] }): string {
  const rows = input.users.length
    ? input.users
        .map(
          (user) => `<div class="chat-item">
      <strong>${escapeHtml(user.email)}</strong>
      <p>${escapeHtml(user.role)} · ${escapeHtml(user.status)} · balance ${escapeHtml(money(user.creditBalanceUsd))}</p>
      <p>LiteLLM budget: ${escapeHtml(user.litellm.maxBudgetUsd === undefined ? "not set" : money(user.litellm.maxBudgetUsd))} · keys ${escapeHtml(String(user.litellm.virtualKeyCount))}</p>
      <form class="inline-form" method="post" action="/users/${escapeAttribute(user.id)}/credits">
        <input type="hidden" name="csrfToken" value="${escapeAttribute(input.csrfToken ?? "")}">
        <input name="amountUsd" inputmode="decimal" placeholder="USD" required>
        <input name="reason" maxlength="120" placeholder="Reason">
        <button type="submit">${renderIcon("budget")}<span>Grant credits</span></button>
      </form>
    </div>`
        )
        .join("")
    : "<p>No users yet.</p>";
  return `<section class="panel"><h2>Users</h2>${rows}</section>`;
}

export function renderAdminDashboardPage(input: {
  csrfToken?: string;
  locale?: SupportedLocale;
  overview: AdminDashboardOverview;
}): string {
  const locale = input.locale ?? "en";
  const t = copy[locale] ?? copy.en;
  return renderShell({
    title: "ModelDock admin operations",
    surface: "admin",
    activePath: "/",
    locale,
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Protected admin host</p>
      <h1>${escapeHtml(t.title)}</h1>
      <p>${escapeHtml(t.body)}</p>
      <div class="actions">
        <a class="action-link" href="/settings">${renderIcon("security")}<span>Access settings</span></a>
        <a class="action-link secondary" href="/setup-account">${renderIcon("key")}<span>Change account</span></a>
      </div>
    </div>
    ${renderGateway(input.overview)}
  </section>
  <section class="grid">
    <div class="metric"><span>${escapeHtml(t.users)}</span><strong>${escapeHtml(String(input.overview.summary.activeUsers))}</strong></div>
    <div class="metric"><span>${escapeHtml(t.pending)}</span><strong>${escapeHtml(String(input.overview.summary.pendingApprovals))}</strong></div>
    <div class="metric"><span>Credit balance</span><strong>${escapeHtml(money(input.overview.summary.totalCreditBalanceUsd))}</strong></div>
  </section>
  <section class="grid">
    ${renderApprovals({ approvals: input.overview.pending, csrfToken: input.csrfToken })}
    ${renderUsers({ users: input.overview.users, csrfToken: input.csrfToken })}
  </section>
</main>`
  });
}
