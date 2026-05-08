import { describe, expect, it } from 'vitest';
import type { WorkspaceClassification } from '../../context/classify-workspace';
import type { InstallTarget } from '../../context/detect-install-targets';
import {
  PACKAGE_MANAGER_BY_NAME,
  type PackageManagerDescriptor,
  renderInstallCommand,
} from '../../utils/package-managers';
import { pickInboxSdk, pickPackagesForTarget } from './install-packages';

function buildTarget(overrides: {
  role: WorkspaceClassification['role'];
  framework?: WorkspaceClassification['framework'];
  isReactNative?: boolean;
  isReactBased?: boolean;
  installed?: string[];
  workspaceName?: string;
  cwd?: string;
}): InstallTarget {
  const installed = new Set(overrides.installed ?? []);
  const framework = overrides.framework ?? 'react';
  const reactBasedDefault = framework !== 'unknown';
  const classification: WorkspaceClassification = {
    role: overrides.role,
    reason: 'test',
    framework,
    isReactNative: overrides.isReactNative ?? false,
    isReactBased: overrides.isReactBased ?? reactBasedDefault,
  };

  return {
    cwd: overrides.cwd ?? '/tmp/ws',
    workspaceName: overrides.workspaceName ?? null,
    classification,
    installedDeps: installed,
    installedNovuPackages: Array.from(installed).filter((d) => d.startsWith('@novu/') || d === 'novu'),
    hasFrameworkRoute: false,
    frameworkRoutePath: null,
    hasTypeScript: installed.has('typescript'),
    pkg: { name: overrides.workspaceName ?? 'sample' },
    packageJsonPath: `${overrides.cwd ?? '/tmp/ws'}/package.json`,
  };
}

describe('pickInboxSdk', () => {
  it('returns @novu/nextjs for any Next.js variant', () => {
    expect(
      pickInboxSdk({
        role: 'fullstack',
        reason: '',
        framework: 'nextjs-app',
        isReactNative: false,
        isReactBased: true,
      })
    ).toBe('@novu/nextjs');
    expect(
      pickInboxSdk({
        role: 'fullstack',
        reason: '',
        framework: 'nextjs-pages',
        isReactNative: false,
        isReactBased: true,
      })
    ).toBe('@novu/nextjs');
  });

  it('returns @novu/react-native for React Native / Expo', () => {
    expect(pickInboxSdk({ role: 'web', reason: '', framework: 'react', isReactNative: true, isReactBased: true })).toBe(
      '@novu/react-native'
    );
  });

  it('returns @novu/react for non-Next.js React-based frameworks', () => {
    expect(
      pickInboxSdk({ role: 'web', reason: '', framework: 'react-vite', isReactNative: false, isReactBased: true })
    ).toBe('@novu/react');
    expect(
      pickInboxSdk({ role: 'fullstack', reason: '', framework: 'remix', isReactNative: false, isReactBased: true })
    ).toBe('@novu/react');
  });

  it('falls back to @novu/js for non-React frameworks (Vue, Svelte, SvelteKit, Nuxt, …)', () => {
    expect(
      pickInboxSdk({ role: 'web', reason: '', framework: 'unknown', isReactNative: false, isReactBased: false })
    ).toBe('@novu/js');
    expect(
      pickInboxSdk({
        role: 'fullstack',
        reason: '',
        framework: 'unknown',
        isReactNative: false,
        isReactBased: false,
      })
    ).toBe('@novu/js');
  });
});

describe('pickPackagesForTarget', () => {
  it('installs the Next.js Inbox SDK + @novu/api in a fullstack workspace for a full goal', () => {
    const target = buildTarget({ role: 'fullstack', framework: 'nextjs-app' });
    expect(pickPackagesForTarget('full', target)).toEqual(['@novu/nextjs', '@novu/api']);
  });

  it('installs @novu/api for an api-only workspace when the goal includes workflows', () => {
    const target = buildTarget({ role: 'api', framework: 'react' });
    expect(pickPackagesForTarget('workflows', target)).toEqual(['@novu/api']);
  });

  it('installs only the Inbox SDK in a web workspace for an inbox goal', () => {
    const target = buildTarget({ role: 'web', framework: 'react-vite' });
    expect(pickPackagesForTarget('inbox', target)).toEqual(['@novu/react']);
  });

  it('does not install workflow packages when the goal is inbox-only', () => {
    const target = buildTarget({ role: 'fullstack', framework: 'nextjs-app' });
    expect(pickPackagesForTarget('inbox', target)).toEqual(['@novu/nextjs']);
  });

  it('does not install Inbox packages when the goal is workflows-only', () => {
    const target = buildTarget({ role: 'fullstack', framework: 'nextjs-app' });
    expect(pickPackagesForTarget('workflows', target)).toEqual(['@novu/api']);
  });

  it('skips already-installed packages', () => {
    const target = buildTarget({
      role: 'fullstack',
      framework: 'nextjs-app',
      installed: ['@novu/nextjs'],
    });
    expect(pickPackagesForTarget('full', target)).toEqual(['@novu/api']);
  });

  it('adds @react-email/components when @novu/framework is present and the goal includes workflows', () => {
    const target = buildTarget({
      role: 'api',
      framework: 'react',
      installed: ['@novu/framework'],
    });
    expect(pickPackagesForTarget('workflows', target)).toEqual(['@novu/api', '@react-email/components']);
  });

  it('does NOT pull @react-email/components when @novu/framework is absent (no-code path)', () => {
    const target = buildTarget({ role: 'api', framework: 'react' });
    expect(pickPackagesForTarget('workflows', target)).toEqual(['@novu/api']);
  });

  it('uses @novu/react-native in a React Native fullstack-equivalent workspace', () => {
    const target = buildTarget({
      role: 'web',
      framework: 'react',
      isReactNative: true,
    });
    expect(pickPackagesForTarget('inbox', target)).toEqual(['@novu/react-native']);
  });

  it('uses @novu/react + @novu/api in a non-Next.js fullstack workspace (Remix)', () => {
    const target = buildTarget({ role: 'fullstack', framework: 'remix', isReactBased: true });
    expect(pickPackagesForTarget('full', target)).toEqual(['@novu/react', '@novu/api']);
  });

  it('uses @novu/js + @novu/api in a fullstack workspace without React (SvelteKit / Nuxt)', () => {
    const target = buildTarget({ role: 'fullstack', framework: 'unknown', isReactBased: false });
    expect(pickPackagesForTarget('full', target)).toEqual(['@novu/js', '@novu/api']);
  });

  it('uses @novu/js in a non-React web workspace (Vue / Svelte / Solid)', () => {
    const target = buildTarget({ role: 'web', framework: 'unknown', isReactBased: false });
    expect(pickPackagesForTarget('inbox', target)).toEqual(['@novu/js']);
  });

  it('returns nothing for library-style targets (defence — install step also filters)', () => {
    const target = buildTarget({ role: 'library', framework: 'unknown' });
    expect(pickPackagesForTarget('full', target)).toEqual([]);
  });
});

describe('renderInstallCommand (smoke — covers the per-workspace command shape used by the install step)', () => {
  const pnpm: PackageManagerDescriptor = PACKAGE_MANAGER_BY_NAME.pnpm;
  const npm: PackageManagerDescriptor = PACKAGE_MANAGER_BY_NAME.npm;
  const yarnV1: PackageManagerDescriptor = PACKAGE_MANAGER_BY_NAME['yarn-v1'];

  it('renders ONE pnpm command containing every package for a workspace', () => {
    const cmd = renderInstallCommand({
      descriptor: pnpm,
      packages: ['@novu/nextjs', '@novu/api'],
      workspaceName: '@app/web',
    });
    expect(cmd).toBe('pnpm add @novu/nextjs @novu/api --ignore-workspace-root-check --filter @app/web');
  });

  it('renders ONE npm command with --workspace and applies --legacy-peer-deps for React 19', () => {
    const cmd = renderInstallCommand({
      descriptor: npm,
      packages: ['@novu/react'],
      workspaceName: '@app/web',
      legacyPeerDeps: true,
    });
    expect(cmd).toBe('npm install @novu/react --workspace @app/web --legacy-peer-deps');
  });

  it('uses `yarn workspace <name> add` shape for yarn v1', () => {
    const cmd = renderInstallCommand({
      descriptor: yarnV1,
      packages: ['@novu/api'],
      workspaceName: '@app/api',
    });
    expect(cmd).toBe('yarn workspace @app/api add @novu/api --ignore-workspace-root-check');
  });

  it('drops the workspace filter when no monorepo name is provided', () => {
    const cmd = renderInstallCommand({
      descriptor: pnpm,
      packages: ['@novu/react'],
      workspaceName: null,
    });
    expect(cmd).toBe('pnpm add @novu/react --ignore-workspace-root-check');
  });
});
