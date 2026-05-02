#!/usr/bin/env node

const command = process.argv[2] ?? "help";

const commands = new Set(["init", "doctor", "migrate", "create-owner", "rotate-secret", "backup", "restore", "upgrade"]);

if (command === "help" || command === "--help" || command === "-h") {
  console.log(`modeldock <command>

Commands:
  init          Create local ModelDock configuration placeholders
  doctor        Check local prerequisites
  migrate       Run database migrations once implemented
  create-owner  Create the first owner once auth is implemented
  rotate-secret Rotate environment-scoped secret material
  backup        Back up database and configuration
  restore       Restore from a backup
  upgrade       Apply upgrade checks and migrations
`);
  process.exit(0);
}

if (!commands.has(command)) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

console.log(`modeldock ${command}: placeholder command registered. See ROADMAP.md for implementation steps.`);
