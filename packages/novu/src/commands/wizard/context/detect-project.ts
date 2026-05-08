import fs from 'node:fs';
import path from 'node:path';
import type { ProjectContext, ProjectFramework } from '../types';
import { detectInstallTargets, type ProjectPackageManager } from './detect-install-targets';

export interface PackageJsonShape {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

/**
 * Builds the wizard's root-level {@link ProjectContext}. The framework /
 * installed-Novu / framework-route signals are intentionally NOT collected
 * here — they live per-workspace on `topology.targets[i]` because in
 * monorepos the root `package.json` rarely carries any of them. Every
 * downstream consumer reads from `project.topology` instead.
 */
export function detectProject(cwd: string = process.cwd()): ProjectContext {
  const rootPackageJsonPath = locatePackageJson(cwd);
  const packageManager = detectPackageManager(cwd);
  const topology = detectInstallTargets(cwd, packageManager);

  return {
    cwd,
    rootPackageJsonPath,
    packageManager,
    hasTypeScript: deriveHasTypeScript(cwd, topology),
    topology,
  };
}

function locatePackageJson(cwd: string): string | null {
  const candidate = path.join(cwd, 'package.json');

  return fs.existsSync(candidate) ? candidate : null;
}

export function readPackageJson(packageJsonPath: string): PackageJsonShape | null {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJsonShape;
  } catch {
    return null;
  }
}

/**
 * Pure framework classifier — takes a cwd (used only for filesystem hints
 * like `app/`, `vite.config.ts`, `wrangler.toml`) and a flat dep map.
 * Exposed so the workspace classifier (`classify-workspace.ts`) and the
 * install-targets walker can re-use the same rules without duplicating
 * them.
 *
 * Order:
 *   1. UI-first stacks (Next.js, Remix, React + Vite, plain React) —
 *      these win even when a server framework is co-installed inside
 *      the same workspace, because the same module also ships UI.
 *   2. Server-side stacks recognised by `classify-workspace.matchApi`
 *      so an api-only workspace renders as `'hono'` / `'express'` /
 *      etc. instead of leaking through as `'unknown'`.
 *   3. `'unknown'` — only reached for genuinely unrecognised
 *      workspaces (e.g. a TypeScript-only library with no app
 *      framework deps).
 */
export function detectFrameworkFromDeps(cwd: string, deps: Record<string, string>): ProjectFramework {
  if ('next' in deps) {
    if (fs.existsSync(path.join(cwd, 'app')) || fs.existsSync(path.join(cwd, 'src/app'))) {
      return 'nextjs-app';
    }

    return 'nextjs-pages';
  }

  if ('@remix-run/react' in deps || '@remix-run/node' in deps) {
    return 'remix';
  }

  if (
    'react' in deps &&
    ('vite' in deps ||
      fs.existsSync(path.join(cwd, 'vite.config.ts')) ||
      fs.existsSync(path.join(cwd, 'vite.config.js')))
  ) {
    return 'react-vite';
  }

  if ('react' in deps) return 'react';

  /**
   * Server-side stacks. Mirrors `classify-workspace.matchApi` so the
   * api-role workspace's `framework` field stays meaningful (`hono`
   * instead of `unknown`). `@nestjs/core` outranks Express because
   * Nest typically pulls Express in transitively but is a richer
   * signal of intent.
   */
  if ('@nestjs/core' in deps) return 'nestjs';
  if ('hono' in deps) return 'hono';
  if ('fastify' in deps) return 'fastify';
  if ('koa' in deps) return 'koa';
  if ('express' in deps) return 'express';
  if ('@trpc/server' in deps) return 'trpc-server';
  if ('@apollo/server' in deps || 'apollo-server' in deps) return 'apollo-server';
  if (
    'wrangler' in deps ||
    fs.existsSync(path.join(cwd, 'wrangler.toml')) ||
    fs.existsSync(path.join(cwd, 'wrangler.jsonc'))
  ) {
    return 'cloudflare-workers';
  }
  if ('aws-lambda' in deps || '@aws-sdk/client-lambda' in deps) return 'aws-lambda';

  return 'unknown';
}

function detectPackageManager(cwd: string): ProjectPackageManager {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';

  return 'npm';
}

function deriveHasTypeScript(rootCwd: string, topology: ProjectContext['topology']): boolean {
  if (fs.existsSync(path.join(rootCwd, 'tsconfig.json'))) return true;

  return topology.targets.some((target) => target.hasTypeScript);
}
