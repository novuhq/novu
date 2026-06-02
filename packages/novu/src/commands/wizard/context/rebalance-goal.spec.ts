import { describe, expect, it } from 'vitest';
import type { WorkspaceClassification } from './classify-workspace';
import type { DetectedTopology, InstallTarget } from './detect-install-targets';
import { rebalanceGoal } from './rebalance-goal';

function classification(role: WorkspaceClassification['role']): WorkspaceClassification {
  return {
    role,
    reason: 'test',
    framework: role === 'fullstack' ? 'nextjs-app' : role === 'api' ? 'react' : 'react-vite',
    isReactNative: false,
    isReactBased: role !== 'api',
  };
}

function buildTarget(role: WorkspaceClassification['role'], name: string): InstallTarget {
  return {
    cwd: `/tmp/${name}`,
    workspaceName: `@app/${name}`,
    classification: classification(role),
    installedDeps: new Set(),
    installedNovuPackages: [],
    hasFrameworkRoute: false,
    frameworkRoutePath: null,
    hasTypeScript: false,
    pkg: { name: `@app/${name}` },
    packageJsonPath: `/tmp/${name}/package.json`,
  };
}

function topologyOf(roles: Array<WorkspaceClassification['role']>): DetectedTopology {
  const targets = roles.filter((r) => r !== 'library').map((r, i) => buildTarget(r, `${r}${i}`));

  return {
    rootCwd: '/tmp/root',
    packageManager: 'pnpm',
    workspaces: roles.map((role, i) => ({
      cwd: `/tmp/${role}${i}`,
      workspaceName: `@app/${role}${i}`,
      classification: classification(role),
    })),
    targets,
    hasWeb: targets.some((t) => t.classification.role === 'web'),
    hasApi: targets.some((t) => t.classification.role === 'api'),
    hasFullstack: targets.some((t) => t.classification.role === 'fullstack'),
  };
}

describe('rebalanceGoal — full goal', () => {
  it('keeps full when there is at least one inbox-host AND one api-host', () => {
    const result = rebalanceGoal({ requestedGoal: 'full', topology: topologyOf(['web', 'api']) });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.effectiveGoal).toBe('full');
  });

  it('keeps full when a single fullstack workspace satisfies both sides', () => {
    const result = rebalanceGoal({ requestedGoal: 'full', topology: topologyOf(['fullstack']) });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.effectiveGoal).toBe('full');
  });

  it('downgrades full → inbox when the topology has only a web workspace', () => {
    const result = rebalanceGoal({ requestedGoal: 'full', topology: topologyOf(['web']) });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.effectiveGoal).toBe('inbox');
      expect(result.reason).toMatch(/no API workspace/i);
    }
  });

  it('downgrades full → workflows when the topology has only an api workspace', () => {
    const result = rebalanceGoal({ requestedGoal: 'full', topology: topologyOf(['api']) });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.effectiveGoal).toBe('workflows');
      expect(result.reason).toMatch(/no UI workspace/i);
    }
  });
});

describe('rebalanceGoal — inbox goal', () => {
  it('proceeds when the topology has a web or fullstack workspace', () => {
    expect(rebalanceGoal({ requestedGoal: 'inbox', topology: topologyOf(['web']) }).kind).toBe('ok');
    expect(rebalanceGoal({ requestedGoal: 'inbox', topology: topologyOf(['fullstack']) }).kind).toBe('ok');
  });

  it('blocks an inbox goal in an api-only topology', () => {
    const result = rebalanceGoal({ requestedGoal: 'inbox', topology: topologyOf(['api']) });
    expect(result.kind).toBe('block');
    if (result.kind === 'block') expect(result.reason).toMatch(/no UI workspace/i);
  });
});

describe('rebalanceGoal — workflows goal', () => {
  it('proceeds when the topology has an api or fullstack workspace', () => {
    expect(rebalanceGoal({ requestedGoal: 'workflows', topology: topologyOf(['api']) }).kind).toBe('ok');
    expect(rebalanceGoal({ requestedGoal: 'workflows', topology: topologyOf(['fullstack']) }).kind).toBe('ok');
  });

  it('blocks a workflows goal in a web-only topology', () => {
    const result = rebalanceGoal({ requestedGoal: 'workflows', topology: topologyOf(['web']) });
    expect(result.kind).toBe('block');
    if (result.kind === 'block') expect(result.reason).toMatch(/no backend workspace/i);
  });
});

describe('rebalanceGoal — empty topology', () => {
  it('preserves the requested goal when no application targets exist', () => {
    const result = rebalanceGoal({ requestedGoal: 'full', topology: topologyOf([]) });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.effectiveGoal).toBe('full');
      expect(result.reason).toBe('');
    }
  });
});
