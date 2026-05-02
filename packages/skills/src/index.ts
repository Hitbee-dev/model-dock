export type SkillPermission = "network" | "filesystem" | "shell" | "credentials" | "provider_tokens";

export type SkillManifest = {
  id: string;
  displayName: string;
  description: string;
  permissions: SkillPermission[];
  enabledByDefault: boolean;
};

export function validateSkillManifest(manifest: SkillManifest): SkillManifest {
  if (!manifest.id || !manifest.displayName.trim() || !manifest.description.trim()) {
    throw new Error("Skill manifest requires id, display name, and description.");
  }

  if (manifest.enabledByDefault && manifest.permissions.length > 0) {
    throw new Error("Skills with risky permissions must be disabled by default.");
  }

  return manifest;
}
