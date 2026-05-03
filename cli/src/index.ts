#!/usr/bin/env node

import { runCreateOwner } from "./commands/create-owner.js";
import { commands, renderHelp } from "./commands/help.js";

const command = process.argv[2] ?? "help";

if (command === "help" || command === "--help" || command === "-h") {
  console.log(renderHelp());
  process.exit(0);
}

if (!commands.has(command)) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (command === "create-owner") {
  try {
    console.log(await runCreateOwner());
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to create owner.");
    process.exit(1);
  }
}

  console.log(`modeldock ${command}: placeholder command registered for the current ModelDock scaffold.`);
