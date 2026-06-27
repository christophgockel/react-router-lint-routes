import ts from "typescript";

export type Violation = {
  file: string;
  line: number;
  text: string;
};

// ts.forEachChild does not populate node.parent, so a node cannot look up the tree
// to check whether it sits inside an href() call or a concatenation expression.
// WalkContext carries that information down instead.
type WalkContext = {
  // When true, the current node is a descendant of an href() call and should not be flagged.
  insideHref: boolean;
  // When true, the current node is inside a + expression. Individual string literals are
  // skipped because the outermost BinaryExpression handler reports the concatenation as a whole.
  insideConcatenation: boolean;
};

export function findViolations(
  program: ts.Program,
  matchesRoute: (value: string) => boolean,
  directory: string,
  excludedFiles: string[],
): Violation[] {
  const violations: Violation[] = [];
  const normalisedExcludes = new Set(excludedFiles.map((f) => `${directory}/${f}`));

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) {
      // Skip type declaration files (*.d.ts) and anything inside node_modules
      continue;
    }

    if (!sourceFile.fileName.startsWith(`${directory}/`)) {
      // Skipping anything outside the directory the user specified.
      // The part of the program being linted might be a subset of a larger project.
      continue;
    }

    if (normalisedExcludes.has(sourceFile.fileName)) {
      continue;
    }

    walkSourceFile(sourceFile, matchesRoute, violations, directory);
  }

  return violations;
}

function walkSourceFile(
  sourceFile: ts.SourceFile,
  matchesRoute: (value: string) => boolean,
  violations: Violation[],
  directory: string,
) {
  function checkNode(node: ts.Node, context: WalkContext) {
    const nowInsideHref = context.insideHref || isHrefCall(node);
    const nowInsideConcatenation = context.insideConcatenation || isConcatenation(node);

    // Plain string literal: "/support"
    // Skip if inside a string concatenation — the BinaryExpression handler covers those.
    if (ts.isStringLiteral(node) && !context.insideConcatenation) {
      const value = node.text;
      if (!nowInsideHref && value.startsWith("/") && matchesRoute(value)) {
        violations.push(createViolation(node, sourceFile, directory));
      }
    }

    // Template literal without interpolation: `/support`
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text;
      if (!nowInsideHref && value.startsWith("/") && matchesRoute(value)) {
        violations.push(createViolation(node, sourceFile, directory));
      }
    }

    // Template literal with interpolation: `/products/${id}`
    if (ts.isTemplateExpression(node)) {
      const head = node.head.text;
      if (!nowInsideHref && head.startsWith("/") && matchesRoute(head)) {
        violations.push(createViolation(node, sourceFile, directory));
      }
    }

    // String concatenation: "/products/" + id
    // Only report on the outermost + expression to avoid duplicate reports from nested chains.
    if (isBinaryExpression(node) && isConcatenation(node) && !context.insideConcatenation) {
      const leftmost = getLeftmostStringValue(node);
      if (!nowInsideHref && leftmost && leftmost.startsWith("/") && matchesRoute(leftmost)) {
        violations.push(createViolation(node, sourceFile, directory));
      }
    }

    ts.forEachChild(node, (child) =>
      checkNode(child, { insideHref: nowInsideHref, insideConcatenation: nowInsideConcatenation }),
    );
  }

  ts.forEachChild(sourceFile, (node) => checkNode(node, { insideHref: false, insideConcatenation: false }));
}

function createViolation(node: ts.Node, sourceFile: ts.SourceFile, directory: string): Violation {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const parentDirectory = directory.substring(0, directory.lastIndexOf("/") + 1);

  return {
    file: sourceFile.fileName.replace(parentDirectory, ""),
    line: line + 1,
    text: node.getText(sourceFile).trim(),
  };
}

function isHrefCall(node: ts.Node): boolean {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "href";
}

function isConcatenation(node: ts.Node): boolean {
  return isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken;
}

function isBinaryExpression(node: ts.Node): node is ts.BinaryExpression {
  return ts.isBinaryExpression(node);
}

// JavaScript's + operator is left-associative, so
//     "/products/" + a + b
// parses as
//     ("/products/" + a) + b
// which means the route prefix is always the leftmost leaf.
function getLeftmostStringValue(node: ts.BinaryExpression): string | null {
  let current: ts.Expression = node.left;

  while (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    current = current.left;
  }

  if (ts.isStringLiteral(current)) {
    return current.text;
  }

  return null;
}
