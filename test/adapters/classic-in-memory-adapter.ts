import ts from "typescript";
import { toLintSourceFiles } from "../../src/adapters/classic-adapter.ts";
import type { CompilerAdapter } from "../../src/compiler-adapter.ts";
import type { LintSourceFile } from "../../src/lint-ast.ts";

// Builds a program from in-memory source strings instead of files on disk.
// Uses the CompilerHost API to intercept file reads, falling through to the real
// filesystem for TypeScript's own lib declarations.
// See https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
export class ClassicInMemoryAdapter implements CompilerAdapter {
  private readonly files: Record<string, string>;

  constructor(files: Record<string, string>) {
    this.files = files;
  }

  sourceFiles(): LintSourceFile[] {
    const files = this.files;
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

    const program = ts.createProgram(fileNames, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }, host);

    return toLintSourceFiles(program);
  }
}
