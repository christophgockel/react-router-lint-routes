// The walker in find-violations.ts operates on these abstractions instead of a
// concrete compiler's node type. Each compiler adapter turns its own nodes into
// LintNode / LintSourceFile, so the walker supports both the classic TypeScript
// API (5.8-6.x) and the native TypeScript 7 API without knowing which is in use.

export type LintNodeKind =
  | "string-literal"
  | "no-substitution-template"
  | "template-expression"
  | "binary-expression"
  | "call-expression"
  | "identifier"
  | "other";

export interface LintAst {
  readonly kind: LintNodeKind;
  // Literal value for string-literal, no-substitution-template and identifier nodes.
  readonly text: string;
  // Head text of a template-expression (the part before the first interpolation).
  readonly templateHead: string;
  // True for a binary-expression whose operator is +.
  readonly isAddition: boolean;
  // Left operand of a binary-expression.
  readonly left: LintAst | undefined;
  // Called expression of a call-expression.
  readonly callee: LintAst | undefined;
  // 1-based line of the node's start.
  readonly line: number;
  // Verbatim source text of the node.
  readonly sourceText: string;
  forEachChild<T>(visit: (child: LintAst) => T | undefined): T | undefined;
}

export interface LintSourceFile {
  readonly fileName: string;
  readonly isDeclarationFile: boolean;
  forEachChild<T>(visit: (child: LintAst) => T | undefined): T | undefined;
}

type SourceFileExtras = {
  readonly fileName: string;
  readonly isDeclarationFile: boolean;
  getLineAndCharacterOfPosition(position: number): { readonly line: number };
};

// Every compiler operation the wrapper needs, expressed over the adapter's own
// node type N and source-file type S.
// The classic and native APIs differ in a few places:
//   - Where their guards live.
//   - Whether forEachChild is a free function or a method.
//   - How a node's text and position are read.
// Each adapter supplies these with concrete types and narrows internally.
// Keeping node access here means find-violations never depends on a compiler's node shape.
export interface NodeApi<N, S> {
  isStringLiteral(node: N): boolean;
  isNoSubstitutionTemplateLiteral(node: N): boolean;
  isTemplateExpression(node: N): boolean;
  isCallExpression(node: N): boolean;
  isBinaryExpression(node: N): boolean;
  isIdentifier(node: N): boolean;
  isAddition(node: N): boolean;
  text(node: N): string;
  templateHead(node: N): string;
  left(node: N): N | undefined;
  callee(node: N): N | undefined;
  forEachChild<T>(node: N, visit: (child: N) => T | undefined): T | undefined;
  getStart(node: N, sourceFile: S): number;
  getText(node: N, sourceFile: S): string;
}

export function createLintSourceFile<N, S extends N & SourceFileExtras>(
  sourceFile: S,
  api: NodeApi<N, S>,
): LintSourceFile {
  return {
    fileName: sourceFile.fileName,
    isDeclarationFile: sourceFile.isDeclarationFile,
    forEachChild(visit) {
      return api.forEachChild(sourceFile, (child) => visit(wrap(child, sourceFile, api)));
    },
  };
}

function classify<N, S>(raw: N, api: NodeApi<N, S>): LintNodeKind {
  if (api.isStringLiteral(raw)) {
    return "string-literal";
  }
  if (api.isNoSubstitutionTemplateLiteral(raw)) {
    return "no-substitution-template";
  }
  if (api.isTemplateExpression(raw)) {
    return "template-expression";
  }
  if (api.isCallExpression(raw)) {
    return "call-expression";
  }
  if (api.isBinaryExpression(raw)) {
    return "binary-expression";
  }
  if (api.isIdentifier(raw)) {
    return "identifier";
  }
  return "other";
}

function wrap<N, S extends SourceFileExtras>(raw: N, sourceFile: S, api: NodeApi<N, S>): LintAst {
  return {
    get kind() {
      return classify(raw, api);
    },
    get text() {
      return api.text(raw);
    },
    get templateHead() {
      return api.templateHead(raw);
    },
    get isAddition() {
      return api.isAddition(raw);
    },
    get left() {
      const operand = api.left(raw);
      return operand === undefined ? undefined : wrap(operand, sourceFile, api);
    },
    get callee() {
      const expression = api.callee(raw);
      return expression === undefined ? undefined : wrap(expression, sourceFile, api);
    },
    get line() {
      return sourceFile.getLineAndCharacterOfPosition(api.getStart(raw, sourceFile)).line + 1;
    },
    get sourceText() {
      return api.getText(raw, sourceFile);
    },
    forEachChild(visit) {
      return api.forEachChild(raw, (child) => visit(wrap(child, sourceFile, api)));
    },
  };
}

// Copies a lazily-wrapped source file into plain objects that do not reference the underlying compiler.
// The native API talks to a server process that must be closed once loading is done, so its nodes cannot
// be read lazily afterwards.
export function materializeSourceFile(sourceFile: LintSourceFile, fileName: string): LintSourceFile {
  const children: LintAst[] = [];
  sourceFile.forEachChild((child) => {
    children.push(materializeNode(child));
  });

  return {
    fileName,
    isDeclarationFile: sourceFile.isDeclarationFile,
    forEachChild(visit) {
      for (const child of children) {
        const result = visit(child);
        if (result) {
          return result;
        }
      }
    },
  };
}

function materializeNode(node: LintAst): LintAst {
  const children: LintAst[] = [];

  node.forEachChild((child) => {
    children.push(materializeNode(child));
  });

  return {
    kind: node.kind,
    text: node.text,
    templateHead: node.templateHead,
    isAddition: node.isAddition,
    left: node.left === undefined ? undefined : materializeNode(node.left),
    callee: node.callee === undefined ? undefined : materializeNode(node.callee),
    line: node.line,
    sourceText: node.sourceText,
    forEachChild(visit) {
      for (const child of children) {
        const result = visit(child);
        if (result) {
          return result;
        }
      }
    },
  };
}
