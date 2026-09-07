import { describe, expect, it } from 'vitest';
import type { WorkspaceClassification } from './classify-workspace';
import type { DetectedTopology, InstallTarget } from './detect-install-targets';
import { summariseTopology } from './summarise-topology';

function classification(overrides: Partial<WorkspaceClassification>): WorkspaceClassification {
  return {
    role: 'fullstack',
    reason: 'Next.js App Router',
    framework: 'nextjs-app',
    isReactNative: false,
    isReactBased: true,
    ...overrides,
  };
}

function target(overrides: Partial<InstallTarget> & { cwd: string }): InstallTarget {
  return {
    workspaceName: null,
    classification: classification({}),
    installedDeps: new Set(),
    installedNovuPackages: [],
    hasFrameworkRoute: false,
    frameworkRoutePath: null,
    hasTypeScript: false,
    pkg: { name: 'fake' },
    packageJsonPath: `${overrides.cwd}/package.json`,
    ...overrides,
  };
}

function topology(overrides: Partial<DetectedTopology> & { targets: InstallTarget[] }): DetectedTopology {
  return {
    rootCwd: '/repo',
    packageManager: 'pnpm',
    workspaces: overrides.targets.map((t) => ({
      cwd: t.cwd,
      workspaceName: t.workspaceName,
      classification: t.classification,
    })),
    hasWeb: false,
    hasApi: false,
    hasFullstack: false,
    ...overrides,
  };
}

describe('summariseTopology', () => {
  it('renders single-app repos as <framework> · <pkg-mgr>', () => {
    const result = summariseTopology(
      topology({
        targets: [target({ cwd: '/repo', classification: classification({ framework: 'nextjs-app' }) })],
      })
    );
    expect(result).toBe('nextjs-app · pnpm');
  });

  it('falls back to the role when the framework is unknown', () => {
    const result = summariseTopology(
      topology({
        packageManager: 'npm',
        targets: [
          target({
            cwd: '/repo',
            classification: classification({ framework: 'unknown', role: 'api' }),
          }),
        ],
      })
    );
    expect(result).toBe('api · npm');
  });

  it('renders monorepos as role counts grouped with framework labels', () => {
    const result = summariseTopology(
      topology({
        targets: [
          target({
            cwd: '/repo/apps/web',
            workspaceName: '@app/web',
            classification: classification({ role: 'fullstack', framework: 'nextjs-app' }),
          }),
          target({
            cwd: '/repo/apps/api',
            workspaceName: '@app/api',
            classification: classification({ role: 'api', framework: 'unknown', isReactBased: false }),
          }),
        ],
      })
    );
    expect(result).toBe('1 fullstack (Next.js) + 1 api · pnpm');
  });

  it('falls back to a library-only label when no targets remain', () => {
    const result = summariseTopology(topology({ targets: [], packageManager: 'yarn' }));
    expect(result).toBe('library-only repo · yarn');
  });
});
