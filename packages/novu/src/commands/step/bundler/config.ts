import type { BuildOptions } from 'esbuild';
import * as path from 'path';

interface BundlerConfigOptions {
  rootDir: string;
  minify?: boolean;
  aliases?: Record<string, string>;
  nodePaths?: string[];
}

export function getBundlerConfig(options: BundlerConfigOptions): BuildOptions {
  const { rootDir, minify = true, aliases, nodePaths } = options;
  const normalizedAliases = normalizeAliases(aliases, rootDir);

  return {
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
    minify,
    sourcemap: false,
    jsx: 'automatic',
    jsxImportSource: 'react',
    conditions: ['worker', 'browser'],
    mainFields: ['browser', 'module', 'main'],
    alias: normalizedAliases,
    nodePaths,
    logLevel: 'warning',
    loader: {
      '.ts': 'tsx',
      '.js': 'jsx',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env': '{}',
      global: 'globalThis',
    },
    banner: {
      js: `
// Cloudflare Workers environment shims
globalThis.process = globalThis.process || { env: { NODE_ENV: 'production' } };
globalThis.global = globalThis.global || globalThis;

// MessageChannel polyfill for React
globalThis.MessageChannel = globalThis.MessageChannel || class MessageChannel {
  constructor() {
    this.port1 = { postMessage: () => {}, onmessage: null };
    this.port2 = { postMessage: () => {}, onmessage: null };
  }
};
      `.trim(),
    },
  };
}

function normalizeAliases(
  aliases: Record<string, string> | undefined,
  rootDir: string
): Record<string, string> | undefined {
  if (!aliases) {
    return undefined;
  }

  const normalizedAliases: Record<string, string> = {};

  for (const [rawAlias, rawTarget] of Object.entries(aliases)) {
    const alias = normalizeAliasKey(rawAlias);
    const target = normalizeAliasTarget(rawTarget);

    if (!alias || !target) {
      continue;
    }

    normalizedAliases[alias] = path.isAbsolute(target) ? target : path.resolve(rootDir, target);
  }

  return Object.keys(normalizedAliases).length > 0 ? normalizedAliases : undefined;
}

function normalizeAliasKey(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.endsWith('/*')) {
    return trimmed.slice(0, -2);
  }

  if (trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

function normalizeAliasTarget(target: string): string {
  const trimmed = target.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.endsWith('/*')) {
    return trimmed.slice(0, -2);
  }

  if (trimmed.endsWith('/') && trimmed.length > 1) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}
