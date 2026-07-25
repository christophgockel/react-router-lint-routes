import type { LintSourceFile } from "./lint-ast.ts";

// Yields a client project's source as the LintSourceFile abstraction.
// Separate implementations wrap the classic TypeScript API and the native TypeScript 7 API.
// This way the tool stays independent of both the client's compiler major and where the sources came from.
export interface CompilerAdapter {
  sourceFiles(): LintSourceFile[];
}
