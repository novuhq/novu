import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';

export type DiscoveredTemplate = {
  filePath: string;
  relativePath: string;
};

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

export async function discoverEmailTemplates(rootDir: string = process.cwd()): Promise<DiscoveredTemplate[]> {
  const files = await fg(['**/*.{tsx,jsx,ts,js}'], {
    cwd: rootDir,
    dot: true,
    absolute: false,
    ignore: DEFAULT_IGNORES,
    followSymbolicLinks: true,
  });

  const out: DiscoveredTemplate[] = [];
  const CONCURRENCY = 32;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchRes = await Promise.all(
      batch.map(async (relativePath) => {
        const filePath = path.join(rootDir, relativePath);
        const exportNames = await findReactEmailExportsTsAst(filePath);
        if (!exportNames.length) return null;
        if (!exportNames.includes('default')) return null;

        return { filePath, relativePath } satisfies DiscoveredTemplate;
      })
    );
    for (const r of batchRes) if (r) out.push(r);
  }

  return out;
}

async function findReactEmailExportsTsAst(filePath: string): Promise<string[]> {
  let text: string;
  try {
    text = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  // Quick check to skip files without React Email imports
  if (!text.includes('@react-email/') && !text.includes('react-email')) {
    return [];
  }

  const scriptKind = getScriptKind(filePath);

  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, /*setParentNodes*/ true, scriptKind);

  let hasReactEmailImport = false;
  let hasJsx = false;

  const exports: string[] = [];

  function visit(node: ts.Node) {
    // imports
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const s = node.moduleSpecifier.text;
      if (s === '@react-email/components' || s.startsWith('@react-email/') || s === 'react-email') {
        hasReactEmailImport = true;
      }
    }

    // JSX usage
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      hasJsx = true;
    }

    // export default ...
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      exports.push('default');
    }

    // export named declarations: export const Foo = ..., export function Foo() ...
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) exports.push(d.name.text);
      }
    }

    if (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const hasDefault = node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (hasDefault) {
        exports.push('default');
      }
      if (node.name) {
        exports.push(node.name.text);
      }
    }

    // export { Foo, Bar as Baz }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        exports.push(el.name.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (!hasReactEmailImport || !hasJsx || exports.length === 0) return [];
  return Array.from(new Set(exports));
}

function getScriptKind(filePath: string): ts.ScriptKind {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
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
