import fs from 'node:fs';
import path from 'node:path';
import type { ProjectFramework } from '../types';
import { detectFrameworkFromDeps, type PackageJsonShape } from './detect-project';

export type WorkspaceRole = 'web' | 'api' | 'fullstack' | 'library';

export interface WorkspaceClassification {
  role: WorkspaceRole;
  /**
   * Human-readable reason ("Detected Next.js — fullstack").
   * Surfaced verbatim in the CLI live-tail so users understand why the
   * wizard picked a particular role for a given workspace.
   */
  reason: string;
  framework: ProjectFramework;
  /**
   * True when `react-native` / `expo` is present. The Inbox SDK picker
   * in the install step keys off this to swap `@novu/react` for
   * `@novu/react-native` (Inbox is a different package on RN).
   */
  isReactNative: boolean;
  /**
   * True when `react` is in deps. The Inbox SDK picker keys off this to
   * pick `@novu/react` for non-Next.js React workspaces (Remix,
   * RedwoodJS, Blitz, Astro+React, React+Vite) and fall back to
   * `@novu/js` (the headless SDK) for non-React frameworks like Vue,
   * SvelteKit, Svelte, Nuxt, Solid, Angular.
   */
  isReactBased: boolean;
}

export interface ClassifyWorkspaceInput {
  cwd: string;
  pkg: PackageJsonShape;
}

/**
 * Pure classifier — turns a workspace's `package.json` (deps, devDeps,
 * scripts) plus a couple of filesystem hints (`vite.config.*`,
 * `index.html`, `wrangler.jsonc`) into a {@link WorkspaceClassification}.
 *
 * Heuristics evaluated top-down — first match wins so fullstack
 * frameworks outrank pure web/api signals (a Next.js workspace ships UI
 * + API routes, so we never want to misclassify it as just "web").
 *
 * The output is intentionally narrow — we don't try to detect every
 * possible web/api framework. Any workspace whose deps don't match a
 * known UI or backend signal gets `library` and is skipped by the
 * install step. Libraries don't produce code that imports `@novu/react`
 * or `@novu/api`, so installing there would be wasted work.
 */
export function classifyWorkspace(input: ClassifyWorkspaceInput): WorkspaceClassification {
  const { cwd, pkg } = input;
  const deps = collectDeps(pkg);
  const scripts = pkg.scripts ?? {};
  const isReactNative = 'react-native' in deps || 'expo' in deps;
  const isReactBased = 'react' in deps;
  const framework = detectFrameworkFromDeps(cwd, deps);

  const fullstack = matchFullstack(cwd, deps);
  if (fullstack) return { role: 'fullstack', reason: fullstack, framework, isReactNative, isReactBased };

  const web = matchWeb(cwd, deps);
  if (web) return { role: 'web', reason: web, framework, isReactNative, isReactBased };

  const api = matchApi(cwd, deps, scripts);
  if (api) return { role: 'api', reason: api, framework, isReactNative, isReactBased };

  return {
    role: 'library',
    reason: 'No web or backend framework detected — treated as a library workspace and skipped.',
    framework,
    isReactNative,
    isReactBased,
  };
}

function matchFullstack(cwd: string, deps: Record<string, string>): string | null {
  if ('next' in deps) {
    return fs.existsSync(path.join(cwd, 'app')) || fs.existsSync(path.join(cwd, 'src/app'))
      ? 'Detected Next.js (App Router) — fullstack.'
      : 'Detected Next.js (Pages Router) — fullstack.';
  }
  if ('@remix-run/node' in deps) return 'Detected Remix (Node adapter) — fullstack.';
  if ('@remix-run/cloudflare' in deps) return 'Detected Remix (Cloudflare adapter) — fullstack.';
  if ('@sveltejs/kit' in deps) return 'Detected SvelteKit — fullstack.';
  if ('nuxt' in deps || 'nuxt3' in deps) return 'Detected Nuxt — fullstack.';
  if ('@redwoodjs/core' in deps) return 'Detected RedwoodJS — fullstack.';
  if ('blitz' in deps) return 'Detected Blitz — fullstack.';
  if ('astro' in deps && hasAstroSsrAdapter(deps)) {
    return 'Detected Astro with SSR adapter — fullstack.';
  }

  return null;
}

function matchWeb(cwd: string, deps: Record<string, string>): string | null {
  if ('react-native' in deps || 'expo' in deps) {
    return 'Detected React Native / Expo — web (mobile).';
  }
  if ('@remix-run/react' in deps) return 'Detected Remix (client-only) — web.';
  if ('vue' in deps) return 'Detected Vue — web.';
  if ('svelte' in deps) return 'Detected Svelte (no SvelteKit) — web.';
  if ('solid-js' in deps) return 'Detected Solid — web.';
  if ('@angular/core' in deps) return 'Detected Angular — web.';
  if ('@builder.io/qwik' in deps) return 'Detected Qwik — web.';
  if ('astro' in deps) return 'Detected Astro (static) — web.';
  if ('react' in deps && 'react-dom' in deps && hasWebBuildSignal(cwd, deps)) {
    return 'Detected React (with web build tool) — web.';
  }

  return null;
}

function matchApi(cwd: string, deps: Record<string, string>, scripts: Record<string, string>): string | null {
  if ('@nestjs/core' in deps) return 'Detected NestJS — api.';
  if ('hono' in deps) return 'Detected Hono — api.';
  if ('fastify' in deps) return 'Detected Fastify — api.';
  if ('koa' in deps) return 'Detected Koa — api.';
  if ('express' in deps) return 'Detected Express — api.';
  if ('@trpc/server' in deps) return 'Detected tRPC server — api.';
  if ('apollo-server' in deps || '@apollo/server' in deps) return 'Detected Apollo Server — api.';
  if (
    'wrangler' in deps ||
    fs.existsSync(path.join(cwd, 'wrangler.toml')) ||
    fs.existsSync(path.join(cwd, 'wrangler.jsonc'))
  ) {
    return 'Detected Cloudflare Workers (wrangler) — api.';
  }
  if ('aws-lambda' in deps || '@aws-sdk/client-lambda' in deps) return 'Detected AWS Lambda — api.';

  if (matchesServerScript(scripts)) {
    return 'Detected server entry-point script — api.';
  }

  return null;
}

function hasAstroSsrAdapter(deps: Record<string, string>): boolean {
  return Object.keys(deps).some((dep) => dep.startsWith('@astrojs/') && dep !== '@astrojs/check');
}

function hasWebBuildSignal(cwd: string, deps: Record<string, string>): boolean {
  if ('vite' in deps || 'webpack' in deps || '@rsbuild/core' in deps || 'parcel' in deps || '@parcel/core' in deps) {
    return true;
  }

  return (
    fs.existsSync(path.join(cwd, 'index.html')) ||
    fs.existsSync(path.join(cwd, 'public/index.html')) ||
    fs.existsSync(path.join(cwd, 'vite.config.ts')) ||
    fs.existsSync(path.join(cwd, 'vite.config.js'))
  );
}

const SERVER_SCRIPT_PATTERN =
  /\b(?:node|tsx|ts-node|bun)\b\s+(?:[\w./-]*\b)?(?:server|index|main|app)(?:\.[cm]?[jt]s)?/i;

function matchesServerScript(scripts: Record<string, string>): boolean {
  for (const cmd of Object.values(scripts)) {
    if (typeof cmd !== 'string') continue;
    if (SERVER_SCRIPT_PATTERN.test(cmd)) return true;
  }

  return false;
}

function collectDeps(pkg: PackageJsonShape): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
}
