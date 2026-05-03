export const commands = new Set([
  "init",
  "doctor",
  "migrate",
  "create-owner",
  "rotate-secret",
  "backup",
  "restore",
  "upgrade"
]);

export function renderHelp(): string {
  return `modeldock <command>

Commands:
  init          Create local ModelDock configuration placeholders
  doctor        Check local prerequisites
  migrate       Run database migrations
  create-owner  Create the first owner account
  rotate-secret Rotate environment-scoped secret material
  backup        Back up database and configuration
  restore       Restore from a backup
  upgrade       Apply upgrade checks and migrations
`;
}
