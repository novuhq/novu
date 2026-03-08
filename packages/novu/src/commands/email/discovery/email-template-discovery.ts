import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';

export interface DiscoveredTemplate {
  filePath: string;
  relativePath: string;
}

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.cache/**',
  '**/tmp/**',
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/test/**',
  '**/tests/**',
  '**/*.stories.{ts,tsx,js,jsx}',
  '**/*.story.{ts,tsx,js,jsx}',
  '**/.storybook/**',
  '**/*.config.{ts,js}',
  '**/*.d.ts',
];

const CONCURRENCY = 32;

export async function discoverEmailTemplates(rootDir: string = process.cwd()): Promise<DiscoveredTemplate[]> {
  const files = await fg(['**/*.{tsx,jsx,ts,js}'], {
    cwd: rootDir,
    dot: true,
    absolute: false,
    ignore: DEFAULT_IGNORES,
    followSymbolicLinks: true,
  });

  const out: DiscoveredTemplate[] = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (relativePath) => {
        const filePath = path.join(rootDir, relativePath);
        const isTemplate = await checkIsReactEmailTemplate(filePath);
        if (!isTemplate) return null;

        return { filePath, relativePath } satisfies DiscoveredTemplate;
      })
    );

    for (const result of batchResults) {
      if (result) out.push(result);
    }
  }

  return out;
}

async function checkIsReactEmailTemplate(filePath: string): Promise<boolean> {
  let text: string;
  try {
    text = await fs.readFile(filePath, 'utf8');
  } catch {
    return false;
  }

  if (!text.includes('@react-email/') && !text.includes('react-email')) {
    return false;
  }

  const scriptKind = getScriptKind(filePath);
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);

  let hasReactEmailImport = false;
  let hasJsx = false;
  let hasDefaultExport = false;

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (
        specifier === '@react-email/components' ||
        specifier.startsWith('@react-email/') ||
        specifier === 'react-email'
      ) {
        hasReactEmailImport = true;
      }
    }

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      hasJsx = true;
    }

    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      hasDefaultExport = true;
    }

    if (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
      hasDefaultExport = true;
    }

    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause) &&
      node.exportClause.elements.some((e) => e.name.text === 'default')
    ) {
      hasDefaultExport = true;
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  return hasReactEmailImport && hasJsx && hasDefaultExport;
}

function getScriptKind(filePath: string): ts.ScriptKind {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.ts':
      return ts.ScriptKind.TS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.JS;
  }
}
