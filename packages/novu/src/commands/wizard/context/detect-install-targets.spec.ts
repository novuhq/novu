import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectInstallTargets } from './detect-install-targets';

let rootDir: string;

function writeFile(relative: string, contents: string): void {
  const target = path.join(rootDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, 'utf8');
}

function writePackageJson(relative: string, body: Record<string, unknown>): void {
  writeFile(relative, JSON.stringify(body, null, 2));
}

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-targets-'));
});

afterEach(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

describe('detectInstallTargets', () => {
  it('returns the cwd as a single target when no monorepo workspaces are configured', () => {
    writePackageJson('package.json', {
      name: 'standalone',
      dependencies: { next: '14.0.0', react: '19.0.0' },
    });
    writeFile('app/page.tsx', '');

    const topology = detectInstallTargets(rootDir, 'pnpm');
    expect(topology.targets).toHaveLength(1);
    expect(topology.targets[0].classification.role).toBe('fullstack');
    expect(topology.hasFullstack).toBe(true);
  });

  it('walks pnpm-workspace.yaml glob entries and classifies each workspace', () => {
    writePackageJson('package.json', { name: 'monorepo', private: true });
    writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'packages/*'\n");

    writePackageJson('apps/web/package.json', {
      name: '@app/web',
      dependencies: { react: '19.0.0', 'react-dom': '19.0.0', vite: '5.0.0' },
    });
    writePackageJson('apps/api/package.json', {
      name: '@app/api',
      dependencies: { hono: '4.0.0' },
    });
    writePackageJson('packages/shared/package.json', {
      name: '@app/shared',
      dependencies: {},
    });

    const topology = detectInstallTargets(rootDir, 'pnpm');

    const byName = new Map(topology.targets.map((t) => [t.workspaceName, t.classification.role]));
    expect(byName.get('@app/web')).toBe('web');
    expect(byName.get('@app/api')).toBe('api');
    expect(byName.has('@app/shared')).toBe(false);

    expect(topology.workspaces.map((w) => w.classification.role).sort()).toEqual(['api', 'library', 'web']);
    expect(topology.hasWeb).toBe(true);
    expect(topology.hasApi).toBe(true);
    expect(topology.hasFullstack).toBe(false);
  });

  it('parses npm workspaces declared in the root package.json', () => {
    writePackageJson('package.json', {
      name: 'monorepo',
      private: true,
      workspaces: ['apps/*'],
    });
    writePackageJson('apps/dashboard/package.json', {
      name: '@app/dashboard',
      dependencies: { next: '14.0.0', react: '19.0.0' },
    });
    writeFile('apps/dashboard/app/page.tsx', '');

    const topology = detectInstallTargets(rootDir, 'npm');
    expect(topology.targets).toHaveLength(1);
    expect(topology.targets[0].classification.role).toBe('fullstack');
    expect(topology.hasFullstack).toBe(true);
  });

  it('returns no targets when every workspace is a library and the root has no app deps', () => {
    writePackageJson('package.json', { name: 'lib-monorepo', private: true });
    writeFile('pnpm-workspace.yaml', "packages:\n  - 'libs/*'\n");
    writePackageJson('libs/utils/package.json', { name: '@libs/utils', dependencies: {} });

    const topology = detectInstallTargets(rootDir, 'pnpm');
    expect(topology.targets).toHaveLength(0);
    expect(topology.workspaces.every((w) => w.classification.role === 'library')).toBe(true);
  });

  it('flags React Native workspaces via classification.isReactNative', () => {
    writePackageJson('package.json', {
      name: 'rn-app',
      dependencies: { react: '19.0.0', 'react-native': '0.74.0' },
    });

    const topology = detectInstallTargets(rootDir, 'npm');
    expect(topology.targets).toHaveLength(1);
    expect(topology.targets[0].classification.role).toBe('web');
    expect(topology.targets[0].classification.isReactNative).toBe(true);
  });
});
