import { escapeAttribute, renderIcon, renderShell } from "@modeldock/ui";

export function renderApprovalsPage(apiUrl: string): string {
  const escapedApiUrl = escapeAttribute(apiUrl);
  return renderShell({
    title: "ModelDock approvals",
    surface: "admin",
    activePath: "/",
    body: `<main class="page">
  <section class="hero">
    <div>
      <p class="eyebrow">Protected admin host</p>
      <h1>Review signup requests from the admin surface only.</h1>
      <p>Admin workflows must stay on a separate protected hostname with application role checks and audit logging.</p>
      <div class="feature-list">
        <div class="feature">${renderIcon("security")}<p>Cloudflare Access or an equivalent identity-aware proxy should protect this host.</p></div>
        <div class="feature">${renderIcon("approvals")}<p>Approvals are separated from the public user app and normal chat routes.</p></div>
      </div>
    </div>
    <form class="form-panel" method="get" action="${escapedApiUrl}/admin/approvals">
      <h2>Pending approvals</h2>
      <p>Load requests only after the protected admin session has been established.</p>
      <button type="submit">${renderIcon("users")}<span>Load pending requests</span></button>
    </form>
  </section>
</main>`
  });
}
