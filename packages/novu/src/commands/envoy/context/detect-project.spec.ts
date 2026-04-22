import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectProject } from './detect-project';

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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects Next.js App Router projects', () => {
    writePackageJson({ next: '14.0.0', react: '18.0.0' });
    writeFile('app/page.tsx', 'export default function Page() { return null; }');
    writeFile('pnpm-lock.yaml', '');

    const project = detectProject(tempDir);
    expect(project.framework).toBe('nextjs-app');
    expect(project.packageManager).toBe('pnpm');
  });

  it('detects Next.js Pages Router projects', () => {
    writePackageJson({ next: '14.0.0', react: '18.0.0' });
    writeFile('pages/index.tsx', 'export default function Page() { return null; }');

    const project = detectProject(tempDir);
    expect(project.framework).toBe('nextjs-pages');
  });

  it('detects React + Vite projects', () => {
    writePackageJson({ react: '18.0.0', vite: '5.0.0' });
    writeFile('vite.config.ts', '');

    const project = detectProject(tempDir);
    expect(project.framework).toBe('react-vite');
  });

  it('finds installed Novu packages and existing framework route', () => {
    writePackageJson({ '@novu/api': '1.0.0', '@novu/framework': '1.0.0', next: '14.0.0' });
    writeFile('app/api/novu/route.ts', "export const POST = () => new Response('ok');");

    const project = detectProject(tempDir);
    expect(project.installedNovuPackages.sort()).toEqual(['@novu/api', '@novu/framework']);
    expect(project.hasFrameworkRoute).toBe(true);
    expect(project.frameworkRoutePath).toBe('app/api/novu/route.ts');
  });

  it('falls back to unknown framework when no markers exist', () => {
    writePackageJson({});

    const project = detectProject(tempDir);
    expect(project.framework).toBe('unknown');
    expect(project.packageManager).toBe('npm');
    expect(project.installedNovuPackages).toEqual([]);
    expect(project.hasFrameworkRoute).toBe(false);
  });
});
