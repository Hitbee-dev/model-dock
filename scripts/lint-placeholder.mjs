import { readFileSync } from "node:fs";

const oldWorkingTitle = ["LLM", "Service", "Starter", "Kit"].join(" ");

const checks = [
  {
    file: "README.md",
    assert: (text) => !text.includes(oldWorkingTitle),
    message: "README.md must use the ModelDock name."
  },
  {
    file: ".gitignore",
    assert: (text) =>
      [".omc/", ".omx/", ".codex/", ".claude/"].every((entry) => text.includes(entry)),
    message: ".gitignore must ignore local AI agent tooling."
  },
  {
    file: ".env.example",
    assert: (text) =>
      text.includes("EXPERIMENTAL_SUBSCRIPTION_OAUTH=false") &&
      !text.includes("sk-replace-me"),
    message: ".env.example must keep subscription OAuth disabled and avoid fake secret-looking keys."
  }
];

const failures = checks.flatMap((check) => {
  const text = readFileSync(check.file, "utf8");
  return check.assert(text) ? [] : [`${check.file}: ${check.message}`];
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("ModelDock scaffold lint passed.");
