import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const fixturePath = resolve(import.meta.dirname, "fixture");
const projectRoot = resolve(import.meta.dirname, "../..");
const cliPath = resolve(projectRoot, "dist/main.js");

function runCli(...args: string[]) {
  return spawnSync("node", [cliPath, ...args], {
    cwd: fixturePath,
    encoding: "utf-8",
  });
}

describe("End-to-End Tests", () => {
  beforeAll(() => {
    execSync("npm run build", { cwd: projectRoot, stdio: "pipe" });

    if (!existsSync(resolve(fixturePath, "node_modules"))) {
      execSync("npm ci", { cwd: fixturePath, stdio: "pipe" });
    }
  }, 60_000);

  it("detects all violation types and ignores safe usage", () => {
    const result = runCli();

    expect(result.status).toBe(1);

    // All four violation types are flagged
    expect(result.stdout).toContain('"/login"');
    expect(result.stdout).toContain("`/dashboard`");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: We do want to verify verbatim output here.
    expect(result.stdout).toContain("`/products/${id}`");
    expect(result.stdout).toContain('"/products/" + id');

    // routes.ts is excluded by default and must not appear in the violations section
    const [preamble, violations] = result.stdout.split("not wrapped in href()");
    expect(preamble).toContain("app/routes.ts");
    expect(violations).toContain("app/violations.ts");
    expect(violations).not.toContain("app/routes.ts");

    // Exactly 4 violations — the safe counterparts are not flagged
    expect(result.stdout).toContain("Found 4 route path(s)");
  });

  it("reports no violations when all route paths use href()", () => {
    const result = runCli("--exclude", "violations.ts");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("All route paths use href().");
  });
});
