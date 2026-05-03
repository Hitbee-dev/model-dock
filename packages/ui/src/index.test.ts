import { describe, expect, it } from "vitest";
import { getSurfaceLabel, renderIcon, renderShell } from "./index.js";

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
});
