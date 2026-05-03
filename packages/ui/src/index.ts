import {
  faChartLine,
  faCheckCircle,
  faCircleNodes,
  faComments,
  faDatabase,
  faKey,
  faLock,
  faServer,
  faShieldHalved,
  faTerminal,
  faUserCheck,
  faUsersGear
} from "@fortawesome/free-solid-svg-icons";

export type ModelDockSurface = "web" | "admin" | "api";

type IconName =
  | "approvals"
  | "budget"
  | "chat"
  | "check"
  | "database"
  | "key"
  | "litellm"
  | "mcp"
  | "security"
  | "server"
  | "terminal"
  | "users";

type IconDefinition = {
  icon: [number, number, string[], string, string | string[]];
};

type ShellOptions = {
  title: string;
  surface: ModelDockSurface;
  activePath?: string;
  body: string;
};

const icons: Record<IconName, IconDefinition> = {
  approvals: faUserCheck,
  budget: faChartLine,
  chat: faComments,
  check: faCheckCircle,
  database: faDatabase,
  key: faKey,
  litellm: faCircleNodes,
  mcp: faServer,
  security: faShieldHalved,
  server: faUsersGear,
  terminal: faTerminal,
  users: faLock
};

export function getSurfaceLabel(surface: ModelDockSurface): string {
  if (surface === "web") {
    return "ModelDock";
  }

  if (surface === "admin") {
    return "ModelDock Admin";
  }

  return "ModelDock API";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function renderIcon(name: IconName, label?: string): string {
  const [width, height, , , pathData] = icons[name].icon;
  const paths = Array.isArray(pathData) ? pathData : [pathData];
  const aria = label ? `role="img" aria-label="${escapeAttribute(label)}"` : `aria-hidden="true"`;

  return `<svg class="md-icon" viewBox="0 0 ${width} ${height}" ${aria} focusable="false">${paths
    .map((path) => `<path fill="currentColor" d="${escapeAttribute(path)}"></path>`)
    .join("")}</svg>`;
}

export function renderShell(options: ShellOptions): string {
  const nav =
    options.surface === "admin"
      ? [
          ["/", "Approvals"],
          ["/audit", "Audit"],
          ["/settings", "Settings"]
        ]
      : [
          ["/", "Overview"],
          ["/chat", "Chat"],
          ["/providers", "Providers"],
          ["/signup", "Access"]
        ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="app-shell" data-surface="${options.surface}">
    <header class="topbar">
      <a class="brand" href="/">
        <span class="brand-mark">${renderIcon("litellm", "ModelDock")}</span>
        <span>${getSurfaceLabel(options.surface)}</span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        ${nav
          .map(([href, label]) => {
            const active = href === options.activePath ? ' aria-current="page"' : "";
            return `<a href="${href}"${active}>${label}</a>`;
          })
          .join("")}
      </nav>
    </header>
    ${options.body}
  </div>
</body>
</html>`;
}

export function renderActionLink(href: string, label: string, icon: IconName): string {
  return `<a class="action-link" href="${escapeAttribute(href)}">${renderIcon(icon)}<span>${escapeHtml(label)}</span></a>`;
}

const styles = `
:root {
  color-scheme: light;
  --bg: #f6f8fb;
  --panel: #ffffff;
  --panel-strong: #eef5ff;
  --text: #172033;
  --muted: #637083;
  --line: #d8e0eb;
  --accent: #1967d2;
  --accent-strong: #0f4fb0;
  --ok: #147a4f;
  --warn: #9a5b00;
  --radius: 8px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); }
a { color: inherit; }
.app-shell { min-height: 100vh; }
.topbar {
  align-items: center;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid var(--line);
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 14px clamp(16px, 4vw, 40px);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand { align-items: center; display: inline-flex; font-weight: 750; gap: 10px; text-decoration: none; }
.brand-mark {
  align-items: center;
  background: #10233f;
  border-radius: var(--radius);
  color: #78f0d0;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}
.nav { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.nav a {
  border-radius: var(--radius);
  color: var(--muted);
  font-size: 14px;
  font-weight: 650;
  padding: 8px 10px;
  text-decoration: none;
}
.nav a[aria-current="page"], .nav a:hover { background: var(--panel-strong); color: var(--accent-strong); }
.page { margin: 0 auto; max-width: 1180px; padding: clamp(24px, 5vw, 56px) clamp(16px, 4vw, 40px); }
.hero { display: grid; gap: 28px; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); align-items: center; }
.eyebrow { color: var(--accent-strong); font-size: 13px; font-weight: 800; letter-spacing: 0; text-transform: uppercase; }
h1 { font-size: clamp(32px, 5vw, 58px); letter-spacing: 0; line-height: 1.02; margin: 10px 0 14px; }
h2 { font-size: 22px; letter-spacing: 0; margin: 0 0 12px; }
p { color: var(--muted); line-height: 1.65; margin: 0 0 16px; }
.panel, .metric, .form-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 20px 45px rgba(30, 45, 80, 0.08);
}
.panel, .form-panel { padding: clamp(18px, 3vw, 28px); }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 28px; }
.metric { padding: 18px; }
.metric strong { display: block; font-size: 26px; margin-top: 8px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.action-link, button {
  align-items: center;
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  color: #fff;
  display: inline-flex;
  font: inherit;
  font-weight: 750;
  gap: 8px;
  min-height: 42px;
  padding: 10px 14px;
  text-decoration: none;
}
.action-link.secondary, button.secondary { background: var(--panel); color: var(--accent-strong); }
.md-icon { flex: none; height: 1em; width: 1em; }
.feature-list { display: grid; gap: 12px; margin-top: 18px; }
.feature { align-items: flex-start; display: flex; gap: 12px; }
.feature .md-icon { color: var(--ok); margin-top: 4px; }
form { display: grid; gap: 16px; }
label { color: var(--text); display: grid; font-weight: 700; gap: 7px; }
input, select, textarea {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text);
  font: inherit;
  min-height: 42px;
  padding: 10px 12px;
  width: 100%;
}
textarea { resize: vertical; }
[role="status"], .notice {
  background: #fff8ea;
  border: 1px solid #f0d59a;
  border-radius: var(--radius);
  color: var(--warn);
  padding: 12px 14px;
}
.chat-layout { display: grid; gap: 18px; grid-template-columns: minmax(0, 280px) minmax(0, 1fr); }
.chat-list { display: grid; gap: 8px; }
.chat-item { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px; }
article { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); min-height: 120px; padding: 16px; }
details { margin-top: 14px; }
@media (max-width: 780px) {
  .topbar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .nav { justify-content: flex-start; width: 100%; }
  .hero, .chat-layout, .grid { grid-template-columns: 1fr; }
  h1 { font-size: 36px; }
  .action-link, button { justify-content: center; width: 100%; }
}
`;
