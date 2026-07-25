import * as ast from "typescript-7/unstable/ast";
import { API } from "typescript-7/unstable/sync";
import { describe, expect, it } from "vitest";
import type { CompilerAdapter } from "../src/compiler-adapter.ts";
import { findViolations } from "../src/find-violations.ts";
import { ClassicInMemoryAdapter } from "./adapters/classic-in-memory-adapter.ts";
import { NativeInMemoryAdapter } from "./adapters/native-in-memory-adapter.ts";

const adapters: [string, (files: Record<string, string>) => CompilerAdapter][] = [
  ["classic", (files) => new ClassicInMemoryAdapter(files)],
  ["native", (files) => new NativeInMemoryAdapter(API, ast, files)],
];

const alwaysMatches = () => true;
const neverMatches = () => false;

describe.each(adapters)("findViolations (%s adapter)", (_name, buildAdapterWithFiles) => {
  it("flags a plain string literal that matches a route", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const path = "/login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe('"/login"');
    expect(violations[0]?.line).toBe(1);
  });

  it("does not flag a string inside an href() call", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const path = href("/login");',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not flag a string that does not match a route", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const path = "/login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, neverMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not flag strings that do not start with a slash", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const name = "login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("flags a template literal without interpolation", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": "const path = `/login`;",
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe("`/login`");
  });

  it("flags a template literal with interpolation", () => {
    const sourceFiles = buildAdapterWithFiles({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: It's a template literal in a program string.
      "/project/app/page.ts": "const id = 1;\nconst path = `/products/${id}`;",
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.line).toBe(2);
  });

  it("does not flag a template literal inside href()", () => {
    const sourceFiles = buildAdapterWithFiles({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: It's a template literal in a program string.
      "/project/app/page.ts": "const id = 1;\nconst path = href(`/products/${id}`);",
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("flags string concatenation by checking the leftmost string", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const id = 1;\nconst path = "/products/" + id;',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe('"/products/" + id');
  });

  it("does not flag string concatenation inside href()", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const id = 1;\nconst path = href("/products/" + id);',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not report duplicate violations for nested concatenation", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const a = 1;\nconst b = 2;\nconst path = "/products/" + a + b;',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
  });

  it("skips files outside the specified directory", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/other/page.ts": 'const path = "/login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("skips excluded files", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/routes.ts": 'const path = "/login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", ["routes.ts"]);

    expect(violations).toHaveLength(0);
  });

  it("does not flag a string nested inside href() via another call", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/page.ts": 'const path = redirect(href("/login"));',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("reports the file path relative to the specified directory parent", () => {
    const sourceFiles = buildAdapterWithFiles({
      "/project/app/pages/login.ts": 'const path = "/login";',
    }).sourceFiles();

    const violations = findViolations(sourceFiles, alwaysMatches, "/project/app", []);

    expect(violations[0]?.file).toBe("app/pages/login.ts");
  });
});
