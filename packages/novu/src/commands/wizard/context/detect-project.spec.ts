import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectFrameworkFromDeps, detectProject } from './detect-project';

let tempDir: string;

function writeFile(relative: string, contents: string) {
  const target = path.join(tempDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, 'utf8');
}

function writePackageJson(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
  writeFile(
    'package.json',
    JSON.stringify({ name: 'sample', version: '0.0.0', dependencies: deps, devDependencies: devDeps })
  );
}

describe('detectProject', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects Next.js App Router projects as a single fullstack target', () => {
    writePackageJson({ next: '14.0.0', react: '18.0.0' });
    writeFile('app/page.tsx', 'export default function Page() { return null; }');
    writeFile('pnpm-lock.yaml', '');

    const project = detectProject(tempDir);
    expect(project.packageManager).toBe('pnpm');
    expect(project.topology.targets).toHaveLength(1);
    const target = project.topology.targets[0];
    expect(target.classification.framework).toBe('nextjs-app');
    expect(target.classification.role).toBe('fullstack');
  });

  it('detects Next.js Pages Router projects', () => {
    writePackageJson({ next: '14.0.0', react: '18.0.0' });
    writeFile('pages/index.tsx', 'export default function Page() { return null; }');

    const project = detectProject(tempDir);
    expect(project.topology.targets).toHaveLength(1);
    expect(project.topology.targets[0].classification.framework).toBe('nextjs-pages');
  });

  it('detects React + Vite projects', () => {
    writePackageJson({ react: '18.0.0', 'react-dom': '18.0.0', vite: '5.0.0' });
    writeFile('vite.config.ts', '');

    const project = detectProject(tempDir);
    expect(project.topology.targets).toHaveLength(1);
    const target = project.topology.targets[0];
    expect(target.classification.framework).toBe('react-vite');
    expect(target.classification.role).toBe('web');
  });

  it('exposes installed Novu packages and existing framework route on the target', () => {
    writePackageJson({ '@novu/api': '1.0.0', '@novu/framework': '1.0.0', next: '14.0.0' });
    writeFile('app/api/novu/route.ts', "export const POST = () => new Response('ok');");

    const project = detectProject(tempDir);
    expect(project.topology.targets).toHaveLength(1);
    const target = project.topology.targets[0];
    expect(target.installedNovuPackages.slice().sort()).toEqual(['@novu/api', '@novu/framework']);
    expect(target.hasFrameworkRoute).toBe(true);
    expect(target.frameworkRoutePath).toBe('app/api/novu/route.ts');
  });

  it('falls back to npm when no lockfile is present', () => {
    writePackageJson({});

    const project = detectProject(tempDir);
    expect(project.packageManager).toBe('npm');
  });

  it('walks pnpm workspaces and exposes per-app topology', () => {
    writeFile(
      'package.json',
      JSON.stringify({ name: 'monorepo', private: true, devDependencies: { typescript: '5.0.0' } })
    );
    writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
    writeFile('pnpm-lock.yaml', '');
    writeFile('tsconfig.json', '{}');

    writeFile(
      'apps/web/package.json',
      JSON.stringify({
        name: '@acme/web',
        dependencies: { next: '14.0.0', react: '18.0.0', '@novu/nextjs': '0.0.0' },
        devDependencies: { typescript: '5.0.0' },
      })
    );
    writeFile('apps/web/app/page.tsx', '');

    writeFile(
      'apps/api/package.json',
      JSON.stringify({
        name: '@acme/api',
        dependencies: { hono: '4.0.0', '@novu/api': '0.0.0' },
        devDependencies: { typescript: '5.0.0' },
      })
    );

    writeFile('packages/ui/package.json', JSON.stringify({ name: '@acme/ui', dependencies: { react: '18.0.0' } }));

    const project = detectProject(tempDir);
    expect(project.packageManager).toBe('pnpm');
    expect(project.hasTypeScript).toBe(true);
    expect(project.topology.workspaces.length).toBeGreaterThanOrEqual(3);
    expect(project.topology.targets.map((t) => t.workspaceName).sort()).toEqual(['@acme/api', '@acme/web']);

    const web = project.topology.targets.find((t) => t.workspaceName === '@acme/web')!;
    expect(web.classification.role).toBe('fullstack');
    expect(web.classification.framework).toBe('nextjs-app');
    expect(web.installedNovuPackages).toContain('@novu/nextjs');

    const api = project.topology.targets.find((t) => t.workspaceName === '@acme/api')!;
    expect(api.classification.role).toBe('api');
    expect(api.classification.framework).toBe('hono');
    expect(api.classification.isReactBased).toBe(false);
    expect(api.installedNovuPackages).toContain('@novu/api');

    const skippedRoles = project.topology.workspaces
      .filter((ws) => ws.workspaceName === '@acme/ui')
      .map((ws) => ws.classification.role);
    expect(skippedRoles).toEqual(['library']);
  });
});

describe('detectFrameworkFromDeps', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-fw-'));
  });
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it.each([
    ['hono', { hono: '4.0.0' }],
    ['nestjs', { '@nestjs/core': '10.0.0' }],
    ['fastify', { fastify: '4.0.0' }],
    ['koa', { koa: '2.0.0' }],
    ['express', { express: '4.0.0' }],
    ['trpc-server', { '@trpc/server': '11.0.0' }],
    ['apollo-server', { '@apollo/server': '4.0.0' }],
    ['cloudflare-workers', { wrangler: '3.0.0' }],
    ['aws-lambda', { 'aws-lambda': '1.0.0' }],
  ])('detects %s from deps', (expected, deps) => {
    expect(detectFrameworkFromDeps(tempDir, deps)).toBe(expected);
  });

  it('detects cloudflare-workers from a wrangler.toml even when wrangler is not in deps', () => {
    fs.writeFileSync(path.join(tempDir, 'wrangler.toml'), '');
    expect(detectFrameworkFromDeps(tempDir, {})).toBe('cloudflare-workers');
  });

  it('prefers a UI framework over a co-installed backend (Next.js + Hono)', () => {
    fs.mkdirSync(path.join(tempDir, 'app'));
    expect(detectFrameworkFromDeps(tempDir, { next: '14.0.0', react: '18.0.0', hono: '4.0.0' })).toBe('nextjs-app');
  });

  it('returns unknown when no app framework dep is present', () => {
    expect(detectFrameworkFromDeps(tempDir, { typescript: '5.0.0' })).toBe('unknown');
  });
});
