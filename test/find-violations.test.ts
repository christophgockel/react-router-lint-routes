import ts from "typescript";
import { describe, expect, it } from "vitest";
import { findViolations } from "../src/find-violations.ts";

// Builds a TypeScript Program from in-memory source strings instead of files on disk.
// Uses the CompilerHost API to intercept file reads, falling through to the real filesystem
// for TypeScript's own lib declarations.
// See https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
function createProgram(files: Record<string, string>): ts.Program {
  const fileNames = Object.keys(files);
  const host = ts.createCompilerHost({});
  const originalGetSourceFile = host.getSourceFile.bind(host);

  host.getSourceFile = (fileName, languageVersion) => {
    if (files[fileName] !== undefined) {
      return ts.createSourceFile(fileName, files[fileName], languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion);
  };

  host.fileExists = (fileName) => files[fileName] !== undefined || ts.sys.fileExists(fileName);
  host.readFile = (fileName) => files[fileName] ?? ts.sys.readFile(fileName);

  return ts.createProgram(fileNames, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }, host);
}

const alwaysMatches = () => true;
const neverMatches = () => false;

describe("findViolations", () => {
  it("flags a plain string literal that matches a route", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const path = "/login";',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe('"/login"');
    expect(violations[0]?.line).toBe(1);
  });

  it("does not flag a string inside an href() call", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const path = href("/login");',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not flag a string that does not match a route", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const path = "/login";',
    });

    const violations = findViolations(program, neverMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not flag strings that do not start with a slash", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const name = "login";',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("flags a template literal without interpolation", () => {
    const program = createProgram({
      "/project/app/page.ts": "const path = `/login`;",
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe("`/login`");
  });

  it("flags a template literal with interpolation", () => {
    const program = createProgram({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: It's a template literal in a program string.
      "/project/app/page.ts": "const id = 1;\nconst path = `/products/${id}`;",
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.line).toBe(2);
  });

  it("does not flag a template literal inside href()", () => {
    const program = createProgram({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: It's a template literal in a program string.
      "/project/app/page.ts": "const id = 1;\nconst path = href(`/products/${id}`);",
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("flags string concatenation by checking the leftmost string", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const id = 1;\nconst path = "/products/" + id;',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.text).toBe('"/products/" + id');
  });

  it("does not flag string concatenation inside href()", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const id = 1;\nconst path = href("/products/" + id);',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("does not report duplicate violations for nested concatenation", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const a = 1;\nconst b = 2;\nconst path = "/products/" + a + b;',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(1);
  });

  it("skips files outside the specified directory", () => {
    const program = createProgram({
      "/project/other/page.ts": 'const path = "/login";',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("skips excluded files", () => {
    const program = createProgram({
      "/project/app/routes.ts": 'const path = "/login";',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", ["routes.ts"]);

    expect(violations).toHaveLength(0);
  });

  it("does not flag a string nested inside href() via another call", () => {
    const program = createProgram({
      "/project/app/page.ts": 'const path = redirect(href("/login"));',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations).toHaveLength(0);
  });

  it("reports the file path relative to the specified directory parent", () => {
    const program = createProgram({
      "/project/app/pages/login.ts": 'const path = "/login";',
    });

    const violations = findViolations(program, alwaysMatches, "/project/app", []);

    expect(violations[0]?.file).toBe("app/pages/login.ts");
  });
});
