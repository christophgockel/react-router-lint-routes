import ts from "typescript";
import type { CompilerAdapter } from "../compiler-adapter.ts";
import { createLintSourceFile, type LintSourceFile, type NodeApi } from "../lint-ast.ts";

const nodeApi: NodeApi<ts.Node, ts.SourceFile> = {
  isStringLiteral: ts.isStringLiteral,
  isNoSubstitutionTemplateLiteral: ts.isNoSubstitutionTemplateLiteral,
  isTemplateExpression: ts.isTemplateExpression,
  isBinaryExpression: ts.isBinaryExpression,
  isCallExpression: ts.isCallExpression,
  isIdentifier: ts.isIdentifier,
  isAddition: (node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken,
  text: (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isIdentifier(node)) {
      return node.text;
    }
    return "";
  },
  templateHead: (node) => (ts.isTemplateExpression(node) ? node.head.text : ""),
  left: (node) => (ts.isBinaryExpression(node) ? node.left : undefined),
  callee: (node) => (ts.isCallExpression(node) ? node.expression : undefined),
  forEachChild: (node, visit) => ts.forEachChild(node, visit),
  getStart: (node, sourceFile) => node.getStart(sourceFile),
  getText: (node, sourceFile) => node.getText(sourceFile),
};

export function toLintSourceFiles(program: ts.Program): LintSourceFile[] {
  return program.getSourceFiles().map((sourceFile) => createLintSourceFile(sourceFile, nodeApi));
}

export class ClassicAdapter implements CompilerAdapter {
  private readonly projectRoot: string;
  private readonly tsconfigFileName: string;

  constructor(projectRoot: string, tsconfigFileName: string) {
    this.projectRoot = projectRoot;
    this.tsconfigFileName = tsconfigFileName;
  }

  sourceFiles(): LintSourceFile[] {
    const configPath = ts.findConfigFile(this.projectRoot, ts.sys.fileExists, this.tsconfigFileName);
    if (configPath === undefined) {
      throw new Error(`Could not find ${this.tsconfigFileName}`);
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, this.projectRoot);
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

    return toLintSourceFiles(program);
  }
}
