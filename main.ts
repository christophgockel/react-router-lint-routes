#!/usr/bin/env node
import { parseArgs } from "node:util";

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

console.log(values);
