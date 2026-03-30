import { type ParserPlugin, parse } from '@babel/parser';
import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
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

type AstNode = Record<string, unknown>;

const STEP_FILE_PATTERN = '**/*.step.{ts,tsx,js,jsx}';

const METHOD_NAME_TO_TYPE: Record<string, string> = {
  email: 'email',
  sms: 'sms',
  chat: 'chat',
  push: 'push',
  inApp: 'in_app',
  delay: 'delay',
  digest: 'digest',
  throttle: 'throttle',
};

const VALID_STEP_TYPES = new Set(Object.values(METHOD_NAME_TO_TYPE));

const TS_WRAPPING_NODE_TYPES = new Set([
  'TSAsExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
]);

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
    const plugins = getParserPlugins(filePath);

    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
    });

    return {
      filePath,
      relativePath,
      metadata: extractStepMetadata(ast.program.body),
      hasDefaultExport: hasDefaultExport(ast.program.body),
      parseErrors: ast.errors.map((e) => {
        const line = e.loc?.line ?? '?';
        const col = e.loc?.column !== undefined ? e.loc.column + 1 : '?';

        return `Syntax error at ${line}:${col}: ${e.message}`;
      }),
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

function getParserPlugins(filePath: string): ParserPlugin[] {
  const ext = path.extname(filePath).toLowerCase();
  const plugins: ParserPlugin[] = [];

  if (ext === '.jsx' || ext === '.tsx') plugins.push('jsx');
  if (ext === '.ts' || ext === '.tsx') plugins.push('typescript');

  return plugins;
}

function extractStepMetadata(body: unknown[]): StepMetadata {
  const metadata: StepMetadata = {};

  for (const node of body) {
    if (!isAstNode(node)) continue;

    if (node.type === 'ExportDefaultDeclaration') {
      extractFromDefaultExport(node.declaration, body, metadata);
    } else if (node.type === 'ExportNamedDeclaration') {
      const specifiers = node.specifiers as AstNode[] | undefined;
      const defaultSpec = specifiers?.find((s) => isAstNode(s.exported) && s.exported.name === 'default');

      if (defaultSpec && isAstNode(defaultSpec.local)) {
        const resolved = resolveIdentifierInitializer(defaultSpec.local.name as string, body);

        if (resolved !== undefined) {
          extractFromDefaultExport(resolved, body, metadata);
        }
      }
    }

    if (metadata.stepId !== undefined || metadata.type !== undefined) break;
  }

  return metadata;
}

function extractFromDefaultExport(declaration: unknown, body: unknown[], metadata: StepMetadata): void {
  let unwrapped = unwrapExpression(declaration);
  if (!unwrapped) return;

  if (unwrapped.type === 'Identifier') {
    const resolved = resolveIdentifierInitializer(unwrapped.name as string, body);
    if (resolved === undefined) return;
    unwrapped = unwrapExpression(resolved);
    if (!unwrapped) return;
  }

  if (unwrapped.type !== 'CallExpression') return;

  const callee = unwrapped.callee;
  if (!isAstNode(callee) || callee.type !== 'MemberExpression') return;

  const obj = callee.object;
  const prop = callee.property;

  if (!isAstNode(obj) || obj.type !== 'Identifier' || obj.name !== 'step') return;
  if (!isAstNode(prop) || prop.type !== 'Identifier') return;

  const methodName = prop.name as string;
  const args = unwrapped.arguments as unknown[] | undefined;
  const firstArg = args?.[0];

  if (!isAstNode(firstArg) || firstArg.type !== 'StringLiteral') return;

  metadata.stepId = firstArg.value as string;
  metadata.type = METHOD_NAME_TO_TYPE[methodName] ?? methodName;
}

function resolveIdentifierInitializer(name: string, body: unknown[]): unknown {
  for (const node of body) {
    if (!isAstNode(node)) continue;

    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations as AstNode[] | undefined;
      const declarator = declarations?.find((d) => isAstNode(d) && isAstNode(d.id) && (d.id as AstNode).name === name);

      if (declarator !== undefined) return (declarator as AstNode).init;
    }

    if (node.type === 'FunctionDeclaration' && isAstNode(node.id) && (node.id as AstNode).name === name) {
      return node;
    }

    if (node.type === 'ExportNamedDeclaration' && isAstNode(node.declaration)) {
      const decl = node.declaration as AstNode;

      if (decl.type === 'VariableDeclaration') {
        const declarations = decl.declarations as AstNode[] | undefined;
        const declarator = declarations?.find(
          (d) => isAstNode(d) && isAstNode(d.id) && (d.id as AstNode).name === name
        );

        if (declarator !== undefined) return (declarator as AstNode).init;
      }
    }
  }

  return undefined;
}

function unwrapExpression(node: unknown): AstNode | null {
  if (!isAstNode(node)) return null;

  let current = node;
  while (TS_WRAPPING_NODE_TYPES.has(current.type as string)) {
    const inner = current.expression;
    if (!isAstNode(inner)) break;
    current = inner;
  }

  return current;
}

function hasDefaultExport(body: unknown[]): boolean {
  for (const node of body) {
    if (!isAstNode(node)) continue;

    if (node.type === 'ExportDefaultDeclaration') return true;

    if (node.type === 'ExportNamedDeclaration') {
      const specifiers = node.specifiers as AstNode[] | undefined;
      if (specifiers?.some((s) => isAstNode(s.exported) && s.exported.name === 'default')) {
        return true;
      }
    }
  }

  return false;
}

function deriveWorkflowId(relativePath: string): string | undefined {
  const parentDir = path.dirname(relativePath);
  if (parentDir === '.' || parentDir === '') return undefined;

  return parentDir.split('/')[0];
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
    if (!analysis.metadata.stepId || !workflowId) continue;

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
    if (files.length <= 1) continue;

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

function isAstNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
