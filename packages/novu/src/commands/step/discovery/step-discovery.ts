import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { DiscoveredStep, StepDiscoveryResult, ValidationError } from '../types';

interface StepMetadata {
  stepId?: string;
  type?: string;
}

interface AnalyzedStepFile {
  filePath: string;
  relativePath: string;
  metadata: StepMetadata;
  hasDefaultExport: boolean;
  parseErrors: string[];
}

const STEP_FILE_PATTERN = '**/*.step.{ts,tsx,js,jsx}';

const METHOD_NAME_TO_TYPE: Record<string, string> = {
  email: 'email',
  sms: 'sms',
  chat: 'chat',
  push: 'push',
  inApp: 'in_app',
};

const VALID_STEP_TYPES = new Set(Object.values(METHOD_NAME_TO_TYPE));

export async function discoverStepFiles(stepsDir: string): Promise<StepDiscoveryResult> {
  const matchedStepFiles = await fg([STEP_FILE_PATTERN], {
    cwd: stepsDir,
    absolute: false,
    onlyFiles: true,
  });

  const relativeStepFiles = matchedStepFiles.sort((a, b) => a.localeCompare(b));
  const analyses = relativeStepFiles.map((relativePath) =>
    analyzeStepFile(path.resolve(stepsDir, relativePath), relativePath)
  );
  const duplicateStepIdErrors = buildDuplicateStepIdErrors(analyses, (rp) => deriveWorkflowId(rp));

  const steps: DiscoveredStep[] = [];
  const errors: ValidationError[] = [];

  for (const analysis of analyses) {
    const workflowId = deriveWorkflowId(analysis.relativePath);
    const fileErrors = [
      ...buildValidationErrors(analysis, workflowId),
      ...(duplicateStepIdErrors.get(analysis.filePath) ?? []),
    ];
    if (fileErrors.length > 0) {
      errors.push({
        filePath: path.relative(process.cwd(), analysis.filePath),
        errors: fileErrors,
      });
      continue;
    }

    const { stepId, type } = analysis.metadata;
    if (stepId && workflowId && type) {
      steps.push({
        stepId,
        workflowId,
        type,
        filePath: analysis.filePath,
        relativePath: analysis.relativePath,
      });
    }
  }

  return {
    valid: errors.length === 0,
    matchedFiles: relativeStepFiles.length,
    steps,
    errors,
  };
}

function analyzeStepFile(filePath: string, relativePath: string): AnalyzedStepFile {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

    return {
      filePath,
      relativePath,
      metadata: extractStepMetadata(sourceFile),
      hasDefaultExport: hasDefaultExportInFile(sourceFile),
      parseErrors: extractParseDiagnostics(sourceFile),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      filePath,
      relativePath,
      metadata: {},
      hasDefaultExport: false,
      parseErrors: [`Failed to read or parse file: ${errorMessage}`],
    };
  }
}

function extractStepMetadata(sourceFile: ts.SourceFile): StepMetadata {
  const metadata: StepMetadata = {};

  function visit(node: ts.Node) {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      extractStepResolverCallMetadata(node.expression, metadata);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return metadata;
}

function deriveWorkflowId(relativePath: string): string | undefined {
  const parentDir = path.dirname(relativePath);
  if (parentDir === '.' || parentDir === '') {
    return undefined;
  }

  return parentDir.split('/')[0];
}

// Matches: step.email('stepId', resolver, opts) — also handles (step.email(...)), `as` casts, and `satisfies` expressions
function extractStepResolverCallMetadata(node: ts.Expression, metadata: StepMetadata): void {
  let unwrapped: ts.Expression = node;
  while (
    ts.isParenthesizedExpression(unwrapped) ||
    ts.isAsExpression(unwrapped) ||
    ts.isTypeAssertionExpression(unwrapped) ||
    ts.isNonNullExpression(unwrapped) ||
    ts.isSatisfiesExpression(unwrapped)
  ) {
    unwrapped = unwrapped.expression;
  }

  if (!ts.isCallExpression(unwrapped)) return;

  const callee = unwrapped.expression;

  if (
    !ts.isPropertyAccessExpression(callee) ||
    !ts.isIdentifier(callee.expression) ||
    callee.expression.text !== 'step'
  ) {
    return;
  }

  const methodName = callee.name.text;
  const firstArg = unwrapped.arguments[0];

  if (!firstArg || !ts.isStringLiteral(firstArg)) return;

  metadata.stepId = firstArg.text;
  metadata.type = METHOD_NAME_TO_TYPE[methodName] ?? methodName;
}

function hasDefaultExportInFile(sourceFile: ts.SourceFile): boolean {
  let hasExport = false;

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && hasModifier(node.modifiers, ts.SyntaxKind.DefaultKeyword)) {
      hasExport = true;
    }
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      hasExport = true;
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      if (node.exportClause.elements.some((el) => el.name.text === 'default')) {
        hasExport = true;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hasExport;
}

function extractParseDiagnostics(sourceFile: ts.SourceFile): string[] {
  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
    .parseDiagnostics;

  return (parseDiagnostics ?? []).map((diagnostic) => formatParseDiagnostic(sourceFile, diagnostic));
}

function buildValidationErrors(analysis: AnalyzedStepFile, workflowId: string | undefined): string[] {
  const errors: string[] = [...analysis.parseErrors];

  if (!workflowId) {
    errors.push('Step file must be inside a workflow folder (e.g., novu/{workflowId}/step-name.step.tsx)');
  }

  if (!analysis.hasDefaultExport) {
    errors.push('Missing default export');

    return errors;
  }

  if (!analysis.metadata.stepId) {
    const validMethods = Object.keys(METHOD_NAME_TO_TYPE).map((k) => `step.${k}()`);
    errors.push(`Missing step resolver: default export must call one of ${validMethods.join(', ')}`);
  }

  if (analysis.metadata.type && !VALID_STEP_TYPES.has(analysis.metadata.type)) {
    errors.push(
      `Invalid step type: '${analysis.metadata.type}' (must be one of: ${Array.from(VALID_STEP_TYPES).join(', ')})`
    );
  }

  return errors;
}

function buildDuplicateStepIdErrors(
  analyses: AnalyzedStepFile[],
  getWorkflowId: (relativePath: string) => string | undefined
): Map<string, string[]> {
  const filesByCompositeKey = groupAnalysesByCompositeKey(analyses, getWorkflowId);

  return buildErrorsForDuplicates(filesByCompositeKey);
}

function groupAnalysesByCompositeKey(
  analyses: AnalyzedStepFile[],
  getWorkflowId: (relativePath: string) => string | undefined
): Map<string, AnalyzedStepFile[]> {
  const grouped = new Map<string, AnalyzedStepFile[]>();

  for (const analysis of analyses) {
    const workflowId = getWorkflowId(analysis.relativePath);
    if (!analysis.metadata.stepId || !workflowId) {
      continue;
    }

    const key = `${workflowId}:${analysis.metadata.stepId}`;
    const files = grouped.get(key) ?? [];
    files.push(analysis);
    grouped.set(key, files);
  }

  return grouped;
}

function buildErrorsForDuplicates(filesByKey: Map<string, AnalyzedStepFile[]>): Map<string, string[]> {
  const errors = new Map<string, string[]>();

  for (const [compositeKey, files] of filesByKey) {
    if (files.length <= 1) {
      continue;
    }

    const firstColonIndex = compositeKey.indexOf(':');
    const workflowId = firstColonIndex >= 0 ? compositeKey.substring(0, firstColonIndex) : compositeKey;
    const stepId = firstColonIndex >= 0 ? compositeKey.substring(firstColonIndex + 1) : '';
    const relativePaths = files.map((file) => path.relative(process.cwd(), file.filePath));

    for (const file of files) {
      const currentFilePath = path.relative(process.cwd(), file.filePath);
      const duplicateLocations = relativePaths.filter((candidate) => candidate !== currentFilePath);
      const entryErrors = errors.get(file.filePath) ?? [];
      entryErrors.push(
        `Duplicate stepId: '${stepId}' for workflow '${workflowId}' is also defined in ${duplicateLocations.join(', ')}`
      );
      errors.set(file.filePath, entryErrors);
    }
  }

  return errors;
}

function getScriptKind(filePath: string): ts.ScriptKind {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    default:
      return ts.ScriptKind.Unknown;
  }
}

function hasModifier(modifiers: readonly ts.ModifierLike[] | undefined, kind: ts.SyntaxKind): boolean {
  return (modifiers ?? []).some((modifier) => modifier.kind === kind);
}

function formatParseDiagnostic(sourceFile: ts.SourceFile, diagnostic: ts.DiagnosticWithLocation): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  return `Syntax error at ${position.line + 1}:${position.character + 1}: ${message}`;
}
