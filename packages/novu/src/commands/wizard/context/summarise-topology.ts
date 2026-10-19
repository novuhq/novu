import type { DetectedTopology, InstallTarget } from './detect-install-targets';

/**
 * Builds the one-line topology summary used by:
 *
 * - the bootstrap row hint in `pipeline/runner.ts`
 * - the "Project detected" line in `ui/logging-ui.ts`
 * - the `Workspaces` row in the bootstrap pane (`bootstrap-welcome.tsx`)
 *
 * Single-app repos collapse to a compact `<framework> · <pkg-mgr>` form;
 * monorepos expand into role counts so the user immediately sees what
 * the wizard discovered.
 *
 * Examples:
 *   "nextjs-app · pnpm"
 *   "1 fullstack (Next.js) + 1 api (Hono) · pnpm"
 *   "2 web · npm"
 *   "library-only repo · pnpm"
 */
export function summariseTopology(topology: DetectedTopology): string {
  const { targets, packageManager } = topology;

  if (targets.length === 0) return `library-only repo · ${packageManager}`;

  if (targets.length === 1) {
    const target = targets[0];

    return `${describeTargetFramework(target)} · ${packageManager}`;
  }

  const byRole = new Map<InstallTarget['classification']['role'], InstallTarget[]>();
  for (const target of targets) {
    const list = byRole.get(target.classification.role) ?? [];
    list.push(target);
    byRole.set(target.classification.role, list);
  }

  const segments: string[] = [];
  for (const role of ['fullstack', 'web', 'api'] as const) {
    const list = byRole.get(role);
    if (!list || list.length === 0) continue;
    const families = uniqueFrameworkLabels(list);
    const familyHint = families.length > 0 ? ` (${families.join(', ')})` : '';
    segments.push(`${list.length} ${role}${familyHint}`);
  }

  if (segments.length === 0) return `library-only repo · ${packageManager}`;

  return `${segments.join(' + ')} · ${packageManager}`;
}

function describeTargetFramework(target: InstallTarget): string {
  const framework = target.classification.framework;
  if (framework !== 'unknown') return framework;

  return target.classification.role;
}

function uniqueFrameworkLabels(targets: InstallTarget[]): string[] {
  const labels = new Set<string>();
  for (const target of targets) {
    const label = describeFrameworkPretty(target);
    if (label) labels.add(label);
  }

  return Array.from(labels);
}

function describeFrameworkPretty(target: InstallTarget): string | null {
  const framework = target.classification.framework;
  switch (framework) {
    case 'nextjs-app':
    case 'nextjs-pages':
      return 'Next.js';
    case 'react-vite':
      return 'Vite';
    case 'remix':
      return 'Remix';
    case 'react':
      return 'React';
    case 'nestjs':
      return 'NestJS';
    case 'hono':
      return 'Hono';
    case 'fastify':
      return 'Fastify';
    case 'koa':
      return 'Koa';
    case 'express':
      return 'Express';
    case 'trpc-server':
      return 'tRPC';
    case 'apollo-server':
      return 'Apollo';
    case 'cloudflare-workers':
      return 'Cloudflare Workers';
    case 'aws-lambda':
      return 'AWS Lambda';
    case 'unknown':
      return null;
    default: {
      const exhaustive: never = framework;

      return exhaustive;
    }
  }
}
