import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Node, SourceFile } from "typescript-7/unstable/ast";
import type { Program } from "typescript-7/unstable/sync";
import type { CompilerAdapter } from "../compiler-adapter.ts";
import { createLintSourceFile, type LintSourceFile, materializeSourceFile, type NodeApi } from "../lint-ast.ts";

// The native modules are injected rather than imported so the same adapters work
// against the client's real typescript/unstable/* in production and against the
// npm-aliased typescript-7/unstable/* in tests. The types come from the alias via
// type-only imports, which are erased at build time.
type SyncModule = typeof import("typescript-7/unstable/sync");
type AstModule = typeof import("typescript-7/unstable/ast");

// TypeScript's compiler API always uses forward slashes, even on Windows.
const toForwardSlash = (p: string) => p.replaceAll("\\", "/");

export function createNodeApi(ast: AstModule): NodeApi<Node, SourceFile> {
  return {
    isStringLiteral: ast.isStringLiteral,
    isNoSubstitutionTemplateLiteral: ast.isNoSubstitutionTemplateLiteral,
    isTemplateExpression: ast.isTemplateExpression,
    isBinaryExpression: ast.isBinaryExpression,
    isCallExpression: ast.isCallExpression,
    isIdentifier: ast.isIdentifier,
    isAddition: (node) => ast.isBinaryExpression(node) && node.operatorToken.kind === ast.SyntaxKind.PlusToken,
    text: (node) => {
      if (ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node) || ast.isIdentifier(node)) {
        return node.text;
      }
      return "";
    },
    templateHead: (node) => (ast.isTemplateExpression(node) ? node.head.text : ""),
    left: (node) => (ast.isBinaryExpression(node) ? node.left : undefined),
    callee: (node) => (ast.isCallExpression(node) ? node.expression : undefined),
    forEachChild: (node, visit) => node.forEachChild(visit),
    getStart: (node, sourceFile) => node.getStart(sourceFile),
    getText: (node, sourceFile) => node.getText(sourceFile),
  };
}

// Collects the lintable source files from a loaded program and detaches them from
// the API. Default-library and external-library files are skipped: they are never
// linted and reading their large trees over the API would be slow.
export function collect(program: Program, nodeApi: NodeApi<Node, SourceFile>): LintSourceFile[] {
  const result: LintSourceFile[] = [];

  for (const name of program.getSourceFileNames()) {
    const sourceFile = program.getSourceFile(name);
    if (sourceFile === undefined) {
      continue;
    }
    if (program.isSourceFileDefaultLibrary(sourceFile) || program.isSourceFileFromExternalLibrary(sourceFile)) {
      continue;
    }

    const lintSourceFile = createLintSourceFile(sourceFile, nodeApi);
    result.push(materializeSourceFile(lintSourceFile, lintSourceFile.fileName));
  }

  return result;
}

export class NativeAdapter implements CompilerAdapter {
  private readonly ApiConstructor: SyncModule["API"];
  private readonly nodeApi: NodeApi<Node, SourceFile>;
  private readonly projectRoot: string;
  private readonly tsconfigFileName: string;

  constructor(ApiConstructor: SyncModule["API"], ast: AstModule, projectRoot: string, tsconfigFileName: string) {
    this.ApiConstructor = ApiConstructor;
    this.nodeApi = createNodeApi(ast);
    this.projectRoot = projectRoot;
    this.tsconfigFileName = tsconfigFileName;
  }

  sourceFiles(): LintSourceFile[] {
    const tsconfigPath = toForwardSlash(resolve(this.projectRoot, this.tsconfigFileName));
    if (!existsSync(tsconfigPath)) {
      throw new Error(`Could not find ${this.tsconfigFileName}`);
    }

    const api = new this.ApiConstructor({ cwd: this.projectRoot });
    try {
      const snapshot = api.updateSnapshot({ openProjects: [tsconfigPath] });
      const project = snapshot.getProjects()[0];
      if (project === undefined) {
        return [];
      }
      return collect(project.program, this.nodeApi);
    } finally {
      api.close();
    }
  }
}
