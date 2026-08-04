#!/usr/bin/env node
import { execSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import ts from "typescript";
import { ClassicAdapter } from "./src/adapters/classic-adapter.ts";
import { NativeAdapter } from "./src/adapters/native-adapter.ts";
import type { CompilerAdapter } from "./src/compiler-adapter.ts";
import { findViolations } from "./src/find-violations.ts";
import type { LintSourceFile } from "./src/lint-ast.ts";
import { createRouteMatcher, extractPaths } from "./src/route-matching.ts";

const DEFAULT_DIRECTORY = "app";
const DEFAULT_TSCONFIG = "tsconfig.json";
const DEFAULT_EXCLUDE = ["routes.ts"];

const { values } = parseArgs({
  options: {
    directory: { type: "string", default: DEFAULT_DIRECTORY },
    tsconfig: { type: "string", default: DEFAULT_TSCONFIG },
    exclude: { type: "string", multiple: true },
    help: { type: "boolean", default: false },
  },
});

const excludedFiles = [...DEFAULT_EXCLUDE, ...(values.exclude ?? [])];

if (values.help) {
  console.log(`Usage: react-router-lint-routes [options]

Options:
  --directory <path>  Directory to lint (default: ${DEFAULT_DIRECTORY})
  --tsconfig <file>   TypeScript config file (default: ${DEFAULT_TSCONFIG})
  --exclude <file>    Files to skip, path relative to --directory (default: routes.ts)
  --help              Show this help`);

  process.exit(0);
}

// TypeScript's compiler API always uses forward slashes, even on Windows.
const toForwardSlash = (p: string) => p.replaceAll("\\", "/");
const projectRoot = toForwardSlash(process.cwd());
const directory = toForwardSlash(join(projectRoot, values.directory));

console.log(`Scanning ${values.directory}/ using ${values.tsconfig}`);

if (excludedFiles.length > 0) {
  console.log(`Excluding: ${excludedFiles.map((f) => `${values.directory}/${f}`).join(", ")}`);
}

// Fetch existing routes
let routeJson: string;
try {
  routeJson = execSync("npx react-router routes --json", {
    cwd: projectRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch {
  console.error("Failed to run `npx react-router routes --json`. Is react-router installed?");
  process.exit(2);
}

const allRoutes = extractPaths(JSON.parse(routeJson));

if (allRoutes.length === 0) {
  console.log("No routes found, nothing to check.");
  process.exit(0);
}

const matchesRoute = createRouteMatcher(allRoutes);

// Pick the adapter that matches the client's TypeScript. The classic API exposes
// createProgram; TypeScript 7's native port does not and serves the compiler API
// from the unstable/* subpaths instead.
const adapter = await selectAdapter(projectRoot, values.tsconfig);

// Load the client's source and find violations
let sourceFiles: LintSourceFile[];
try {
  sourceFiles = adapter.sourceFiles();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

// Find and report violations
const violations = findViolations(sourceFiles, matchesRoute, directory, excludedFiles);

if (violations.length > 0) {
  console.log(
    `\nFound ${violations.length} route path(s) not wrapped in href(). Use href() from react-router instead:\n`,
  );

  const grouped = Map.groupBy(violations, (v) => v.file);

  for (const [file, fileViolations] of grouped) {
    console.log(`  ${file}`);
    for (const v of fileViolations) {
      console.log(`    Line ${v.line}: ${v.text}`);
    }
    console.log();
  }

  process.exit(1);
}

console.log("All route paths use href().");

async function selectAdapter(projectRoot: string, tsconfigFileName: string): Promise<CompilerAdapter> {
  if (typeof ts.createProgram === "function") {
    return new ClassicAdapter(projectRoot, tsconfigFileName);
  }

  // TypeScript 7: load the native compiler API from the unstable/* subpaths. The
  // specifiers are held in variables so this project's own tsc (6.x, which lacks
  // those subpaths) does not try to resolve them. The resulting modules are untyped
  // here; createNativeAdapter types them via the typescript-7 alias.
  const syncSpecifier = "typescript/unstable/sync";
  const astSpecifier = "typescript/unstable/ast";
  const syncModule = await import(syncSpecifier);
  const astModule = await import(astSpecifier);

  return new NativeAdapter(syncModule.API, astModule, projectRoot, tsconfigFileName);
}
