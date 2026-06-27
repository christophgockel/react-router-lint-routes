#!/usr/bin/env node
import { execSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import ts from "typescript";
import { findViolations } from "./src/find-violations.ts";
import { createRouteMatcher, extractPaths } from "./src/route-matching.ts";

const DEFAULT_DIRECTORY = "app";
const DEFAULT_TSCONFIG = "tsconfig.json";
const DEFAULT_EXCLUDE: string[] = [];

const { values } = parseArgs({
  options: {
    directory: { type: "string", default: DEFAULT_DIRECTORY },
    tsconfig: { type: "string", default: DEFAULT_TSCONFIG },
    exclude: { type: "string", multiple: true, default: DEFAULT_EXCLUDE },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(`Usage: react-router-lint-routes [options]

Options:
  --directory <path>  Directory to lint (default: ${DEFAULT_DIRECTORY})
  --tsconfig <file>   TypeScript config file (default: ${DEFAULT_TSCONFIG})
  --exclude <file>    Files to skip, repeatable (default: none)
  --help              Show this help`);

  process.exit(0);
}

// TypeScript's compiler API always uses forward slashes, even on Windows.
const toForwardSlash = (p: string) => p.replaceAll("\\", "/");
const projectRoot = toForwardSlash(process.cwd());
const directory = toForwardSlash(join(projectRoot, values.directory));

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
const matchesRoute = createRouteMatcher(allRoutes);

// Build the TypeScript program
const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, values.tsconfig);
if (!configPath) {
  console.error(`Could not find ${values.tsconfig}`);
  process.exit(2);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

// Find and report violations
const violations = findViolations(program, matchesRoute, directory, values.exclude);

if (violations.length > 0) {
  console.log(
    `\nFound ${violations.length} route path(s) not wrapped in href(). Use href() from react-router instead:\n`,
  );

  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.text}\n`);
  }

  process.exit(1);
}

console.log("All route paths use href().");
