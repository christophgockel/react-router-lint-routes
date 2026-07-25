import type { LintAst, LintSourceFile } from "./lint-ast.ts";

export type Violation = {
  file: string;
  line: number;
  text: string;
};

// The walker does not track parent nodes, so a node cannot look up the tree to check
// whether it sits inside an href() call or a concatenation expression. WalkContext
// carries that information down instead.
type WalkContext = {
  // When true, the current node is a descendant of an href() call and should not be flagged.
  insideHref: boolean;
  // When true, the current node is inside a + expression. Individual string literals are
  // skipped because the outermost concatenation handler reports the concatenation as a whole.
  insideConcatenation: boolean;
};

export function findViolations(
  sourceFiles: LintSourceFile[],
  matchesRoute: (value: string) => boolean,
  directory: string,
  excludedFiles: string[],
): Violation[] {
  const violations: Violation[] = [];
  const normalisedExcludes = new Set(excludedFiles.map((f) => `${directory}/${f}`));

  for (const sourceFile of sourceFiles) {
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
  sourceFile: LintSourceFile,
  matchesRoute: (value: string) => boolean,
  violations: Violation[],
  directory: string,
) {
  function checkNode(node: LintAst, context: WalkContext) {
    const nowInsideHref = context.insideHref || isHrefCall(node);
    const nowInsideConcatenation = context.insideConcatenation || node.isAddition;

    // Plain string literal: "/support"
    // Skip if inside a string concatenation (the concatenation handler covers those)
    if (node.kind === "string-literal" && !context.insideConcatenation) {
      const value = node.text;
      if (!nowInsideHref && value.startsWith("/") && matchesRoute(value)) {
        violations.push(createViolation(node, sourceFile.fileName, directory));
      }
    }

    // Template literal without interpolation: `/support`
    if (node.kind === "no-substitution-template") {
      const value = node.text;
      if (!nowInsideHref && value.startsWith("/") && matchesRoute(value)) {
        violations.push(createViolation(node, sourceFile.fileName, directory));
      }
    }

    // Template literal with interpolation: `/products/${id}`
    if (node.kind === "template-expression") {
      const head = node.templateHead;

      if (!nowInsideHref && head.startsWith("/") && matchesRoute(head)) {
        violations.push(createViolation(node, sourceFile.fileName, directory));
      }
    }

    // String concatenation: "/products/" + id
    // Only report on the outermost + expression to avoid duplicate reports from nested chains.
    if (node.isAddition && !context.insideConcatenation) {
      const leftmost = getLeftmostStringValue(node);

      if (!nowInsideHref && leftmost !== undefined && leftmost.startsWith("/") && matchesRoute(leftmost)) {
        violations.push(createViolation(node, sourceFile.fileName, directory));
      }
    }

    node.forEachChild((child) =>
      checkNode(child, { insideHref: nowInsideHref, insideConcatenation: nowInsideConcatenation }),
    );
  }

  sourceFile.forEachChild((node) => checkNode(node, { insideHref: false, insideConcatenation: false }));
}

function createViolation(node: LintAst, fileName: string, directory: string): Violation {
  const parentDirectory = directory.substring(0, directory.lastIndexOf("/") + 1);

  return {
    file: fileName.replace(parentDirectory, ""),
    line: node.line,
    text: node.sourceText.trim(),
  };
}

function isHrefCall(node: LintAst): boolean {
  return node.kind === "call-expression" && node.callee?.kind === "identifier" && node.callee.text === "href";
}

// JavaScript's + operator is left-associative, so
//     "/products/" + a + b
// parses as
//     ("/products/" + a) + b
// which means the route prefix is always the leftmost leaf.
function getLeftmostStringValue(node: LintAst): string | undefined {
  let current = node.left;

  while (current?.isAddition) {
    current = current.left;
  }

  if (current !== undefined && current.kind === "string-literal") {
    return current.text;
  }

  return undefined;
}
