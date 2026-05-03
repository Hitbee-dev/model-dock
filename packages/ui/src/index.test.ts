import { describe, expect, it } from "vitest";
import { getSurfaceLabel, renderIcon, renderShell, resolveLocaleFromHeaders } from "./index.js";

describe("UI contracts", () => {
  it("keeps admin labeling separate from the user surface", () => {
    expect(getSurfaceLabel("web")).toBe("ModelDock");
    expect(getSurfaceLabel("admin")).toBe("ModelDock Admin");
  });

  it("renders Font Awesome svg icons without external assets", () => {
    const icon = renderIcon("security", "Security");

    expect(icon).toContain("<svg");
    expect(icon).toContain('role="img"');
    expect(icon).toContain("<path");
    expect(icon).not.toContain("http");
  });

  it("renders a responsive shell with mobile viewport metadata", () => {
    const page = renderShell({ title: "ModelDock", surface: "web", activePath: "/", body: "<main></main>" });

    expect(page).toContain('name="viewport"');
    expect(page).toContain("@media (max-width: 780px)");
    expect(page).toContain('aria-current="page"');
  });

  it("resolves locale from Cloudflare country before browser language", () => {
    expect(resolveLocaleFromHeaders({ "cf-ipcountry": "KR", "accept-language": "en-US,en;q=0.9" })).toBe("ko");
    expect(resolveLocaleFromHeaders({ "accept-language": "ja-JP,ja;q=0.9" })).toBe("ja");
    expect(resolveLocaleFromHeaders({})).toBe("en");
  });

  it("renders localized navigation labels", () => {
    const page = renderShell({ title: "ModelDock", surface: "web", activePath: "/", locale: "ko", body: "<main></main>" });

    expect(page).toContain('lang="ko"');
    expect(page).toContain("채팅");
  });
});
