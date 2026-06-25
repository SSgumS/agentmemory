import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Load ~/.agentmemory/.env into process.env before any hook reads env vars.
// Keys already set in the environment (e.g. via Claude Code settings.json or
// the shell) take priority — this only fills gaps.
const envPath = join(homedir(), ".agentmemory", ".env");
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch {
  // file absent or unreadable — skip silently
}
