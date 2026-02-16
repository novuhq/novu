import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { DiscoveredStep, StepDiscoveryResult, ValidationError } from '../types';

interface StepMetadata {
  stepId?: string;
  workflowId?: string;
  type?: string;
}

interface AnalyzedStepFile {
  filePath: string;
  relativePath: string;
  metadata: StepMetadata;
  hasDefaultExport: boolean;
  hasReactEmailImport: boolean;
  parseErrors: string[];
}

const STEP_FILE_PATTERN = '**/*.step.{ts,tsx,js,jsx}';

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
  const duplicateStepIdErrors = buildDuplicateStepIdErrors(analyses);

  const steps: DiscoveredStep[] = [];
  const errors: ValidationError[] = [];

  for (const analysis of analyses) {
    const fileErrors = [...buildValidationErrors(analysis), ...(duplicateStepIdErrors.get(analysis.filePath) ?? [])];
    if (fileErrors.length > 0) {
      errors.push({
        filePath: path.relative(process.cwd(), analysis.filePath),
        errors: fileErrors,
      });
      continue;
    }

    const { stepId, workflowId, type } = analysis.metadata;
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
      hasReactEmailImport: hasReactEmailImportInFile(sourceFile),
      parseErrors: extractParseDiagnostics(sourceFile),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      filePath,
      relativePath,
      metadata: {},
      hasDefaultExport: false,
      hasReactEmailImport: false,
      parseErrors: [`Failed to read or parse file: ${errorMessage}`],
    };
  }
}

function extractStepMetadata(sourceFile: ts.SourceFile): StepMetadata {
  const metadata: StepMetadata = {};

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node) && hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)) {
      extractExportedStringLiterals(node, metadata);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return metadata;
}

function extractExportedStringLiterals(node: ts.VariableStatement, metadata: StepMetadata): void {
  for (const declaration of node.declarationList.declarations) {
    if (
      !ts.isIdentifier(declaration.name) ||
      !declaration.initializer ||
      !ts.isStringLiteral(declaration.initializer)
    ) {
      continue;
    }

    const exportName = declaration.name.text;
    const exportValue = declaration.initializer.text;

    if (exportName === 'stepId') metadata.stepId = exportValue;
    if (exportName === 'workflowId') metadata.workflowId = exportValue;
    if (exportName === 'type') metadata.type = exportValue;
  }
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

function hasReactEmailImportInFile(sourceFile: ts.SourceFile): boolean {
  let hasImport = false;

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleText = node.moduleSpecifier.text;
      if (moduleText === 'react-email' || moduleText.startsWith('@react-email/')) {
        hasImport = true;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hasImport;
}

function extractParseDiagnostics(sourceFile: ts.SourceFile): string[] {
  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
    .parseDiagnostics;

  return (parseDiagnostics ?? []).map((diagnostic) => formatParseDiagnostic(sourceFile, diagnostic));
}

function buildValidationErrors(analysis: AnalyzedStepFile): string[] {
  const errors: string[] = [...analysis.parseErrors];

  if (!analysis.metadata.stepId) {
    errors.push("Missing required export: 'stepId' (must be a string literal)");
  }

  if (!analysis.metadata.workflowId) {
    errors.push("Missing required export: 'workflowId' (must be a string literal)");
  }

  if (!analysis.metadata.type) {
    errors.push("Missing required export: 'type' (must be a string literal)");
  } else if (analysis.metadata.type !== 'email') {
    errors.push(`Invalid type: '${analysis.metadata.type}' (must be 'email')`);
  }

  if (!analysis.hasDefaultExport) {
    errors.push('Missing default function export');
  }

  if (!analysis.hasReactEmailImport) {
    errors.push("Missing import from '@react-email'");
  }

  return errors;
}

function buildDuplicateStepIdErrors(analyses: AnalyzedStepFile[]): Map<string, string[]> {
  const filesByCompositeKey = groupAnalysesByCompositeKey(analyses);
  return buildErrorsForDuplicates(filesByCompositeKey);
}

function groupAnalysesByCompositeKey(analyses: AnalyzedStepFile[]): Map<string, AnalyzedStepFile[]> {
  const grouped = new Map<string, AnalyzedStepFile[]>();

  for (const analysis of analyses) {
    if (!analysis.metadata.stepId || !analysis.metadata.workflowId) {
      continue;
    }

    const key = `${analysis.metadata.workflowId}:${analysis.metadata.stepId}`;
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
