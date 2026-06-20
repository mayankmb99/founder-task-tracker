import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "all";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadLocalEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const file = path.resolve(root, ".env.local");
  try {
    const contents = readFileSync(file, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!key || env[key] !== undefined) continue;
      env[key] = rest.join("=");
    }
  } catch {
    // Ignore missing local env files; the child scripts will surface
    // any required configuration gaps explicitly.
  }
  return env;
}

const commands: Record<string, string[]> = {
  deterministic: ["scripts/evals/deterministic.ts"],
  task: ["scripts/evals/taskExtraction.ts"],
  strategy: ["scripts/evals/preparationStrategy.ts"],
  all: ["scripts/evals/deterministic.ts", "scripts/evals/taskExtraction.ts", "scripts/evals/preparationStrategy.ts"],
};

if (!commands[mode]) {
  console.error(`Unknown eval mode: ${mode}`);
  process.exit(1);
}

for (const script of commands[mode]) {
  console.log(`\n>>> Running ${script}`);
  execFileSync("tsx", [script], { cwd: root, stdio: "inherit", env: loadLocalEnv() });
}
