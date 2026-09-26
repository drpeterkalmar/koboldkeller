// Playwright aus globaler Installation laden (npm root -g / nvm)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function loadPlaywright() {
  const roots = [];
  try { roots.push(execSync("npm root -g", { encoding: "utf8" }).trim()); } catch (e) { }
  const nvm = join(homedir(), ".nvm/versions/node");
  if (existsSync(nvm)) for (const v of readdirSync(nvm)) roots.push(join(nvm, v, "lib/node_modules"));
  roots.push("/usr/local/lib/node_modules", "/opt/homebrew/lib/node_modules");
  for (const r of roots) {
    const p = join(r, "playwright");
    if (existsSync(p)) return createRequire(join(r, "_"))("playwright");
  }
  throw new Error("Playwright nicht gefunden (npm root -g)");
}
