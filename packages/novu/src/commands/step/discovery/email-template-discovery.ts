import { type ParserPlugin, parse } from '@babel/parser';
import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';

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

  const ext = path.extname(filePath).toLowerCase();
  const plugins: ParserPlugin[] = ['jsx'];
  if (ext === '.ts' || ext === '.tsx') {
    plugins.push('typescript');
  }

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(text, { sourceType: 'module', plugins, errorRecovery: true });
  } catch {
    return false;
  }

  let hasReactEmailImport = false;
  let hasJsx = false;
  let hasDefaultExport = false;

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    const n = node as Record<string, unknown>;
    if (typeof n.type !== 'string') return;

    if (n.type === 'ImportDeclaration') {
      const source = n.source as Record<string, unknown> | undefined;
      const specifier = typeof source?.value === 'string' ? source.value : '';
      if (
        specifier === '@react-email/components' ||
        specifier.startsWith('@react-email/') ||
        specifier === 'react-email'
      ) {
        hasReactEmailImport = true;
      }
    }

    if (n.type === 'JSXElement' || n.type === 'JSXFragment') {
      hasJsx = true;
    }

    if (n.type === 'ExportDefaultDeclaration') {
      hasDefaultExport = true;
    }

    for (const value of Object.values(n)) {
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
      } else if (value && typeof value === 'object') {
        walk(value);
      }
    }
  }

  walk(ast.program);

  return hasReactEmailImport && hasJsx && hasDefaultExport;
}
