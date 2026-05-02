export type ModelDockSurface = "web" | "admin" | "api";

export function getSurfaceLabel(surface: ModelDockSurface): string {
  if (surface === "web") {
    return "ModelDock";
  }

  if (surface === "admin") {
    return "ModelDock Admin";
  }

  return "ModelDock API";
}
