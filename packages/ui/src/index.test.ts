import { describe, expect, it } from "vitest";
import { getSurfaceLabel } from "./index.js";

describe("UI contracts", () => {
  it("keeps admin labeling separate from the user surface", () => {
    expect(getSurfaceLabel("web")).toBe("ModelDock");
    expect(getSurfaceLabel("admin")).toBe("ModelDock Admin");
  });
});
