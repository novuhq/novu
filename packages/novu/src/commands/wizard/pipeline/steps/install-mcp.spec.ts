import { describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';
import type { McpInstaller } from '../../mcp/installer';
import type { SkillHost } from '../../skills/install-skills';
import type { ResolvedAuth, WizardCommandOptions } from '../../types';
import type { WizardStore } from '../../ui/store';
import type { McpInstallResult } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';
import { runInstallMcpStep } from './install-mcp';

describe('runInstallMcpStep', () => {
  it('installs into every host-mapped client when autoSelect is true', async () => {
    const harness = createHarness({
      detected: ['cursor', 'claude-code', 'vscode', 'windsurf'],
    });

    await runInstallMcpStep({
      ui: harness.ui,
      store: harness.store,
      installer: harness.installer,
      auth: fakeAuth(),
      options: {} as WizardCommandOptions,
      hosts: ['cursor', 'claude'],
      autoSelect: true,
    });

    expect(harness.installer.install).toHaveBeenCalledTimes(2);
    expect(harness.installer.install).toHaveBeenNthCalledWith(1, 'cursor', expect.any(Object));
    expect(harness.installer.install).toHaveBeenNthCalledWith(2, 'claude-code', expect.any(Object));
    expect(harness.calls.addMcpInstall).toHaveLength(2);
    expect(harness.calls.finishMcpInstalls).toEqual([false]);
  });

  it('skips hosts whose mapped MCP client is not present on disk', async () => {
    const harness = createHarness({ detected: ['cursor'] });

    await runInstallMcpStep({
      ui: harness.ui,
      store: harness.store,
      installer: harness.installer,
      auth: fakeAuth(),
      options: {} as WizardCommandOptions,
      hosts: ['cursor', 'claude', 'agents'],
      autoSelect: true,
    });

    expect(harness.installer.install).toHaveBeenCalledTimes(1);
    expect(harness.installer.install).toHaveBeenCalledWith('cursor', expect.any(Object));
  });

  it('finishes the phase as skipped when no host maps to a detected client', async () => {
    const harness = createHarness({ detected: [] });

    await runInstallMcpStep({
      ui: harness.ui,
      store: harness.store,
      installer: harness.installer,
      auth: fakeAuth(),
      options: {} as WizardCommandOptions,
      hosts: ['agents'],
      autoSelect: true,
    });

    expect(harness.installer.install).not.toHaveBeenCalled();
    expect(harness.calls.finishMcpInstalls).toEqual([true]);
  });

  it('falls back to the first detected client when hosts are not provided', async () => {
    const harness = createHarness({ detected: ['claude-code'] });

    await runInstallMcpStep({
      ui: harness.ui,
      store: harness.store,
      installer: harness.installer,
      auth: fakeAuth(),
      options: {} as WizardCommandOptions,
      autoSelect: true,
    });

    expect(harness.installer.install).toHaveBeenCalledTimes(1);
    expect(harness.installer.install).toHaveBeenCalledWith('claude-code', expect.any(Object));
  });

  it('continues fanning out when one client install rejects', async () => {
    const harness = createHarness({ detected: ['cursor', 'claude-code'] });
    harness.installer.install
      .mockResolvedValueOnce({ clientId: 'cursor', clientLabel: 'Cursor', configPath: '/c' })
      .mockRejectedValueOnce(new Error('boom'));

    await runInstallMcpStep({
      ui: harness.ui,
      store: harness.store,
      installer: harness.installer,
      auth: fakeAuth(),
      options: {} as WizardCommandOptions,
      hosts: ['cursor', 'claude'],
      autoSelect: true,
    });

    expect(harness.installer.install).toHaveBeenCalledTimes(2);
    expect(harness.calls.addMcpInstall).toHaveLength(1);
    expect(harness.calls.statuses.some((s) => /failed/.test(s.message))).toBe(true);
  });
});

interface Harness {
  ui: WizardUI;
  store: WizardStore;
  installer: {
    detect: ReturnType<typeof vi.fn>;
    install: ReturnType<typeof vi.fn>;
  } & McpInstaller;
  calls: {
    addMcpInstall: McpInstallResult[];
    finishMcpInstalls: boolean[];
    statuses: { message: string; tone?: 'info' | 'ok' | 'error' | 'warn' }[];
  };
}

function createHarness(opts: { detected: string[] }): Harness {
  const calls: Harness['calls'] = { addMcpInstall: [], finishMcpInstalls: [], statuses: [] };

  const detect = vi.fn(() => [
    { id: 'cursor', label: 'Cursor', detected: opts.detected.includes('cursor') },
    { id: 'claude-code', label: 'Claude Code', detected: opts.detected.includes('claude-code') },
    { id: 'vscode', label: 'VS Code', detected: opts.detected.includes('vscode') },
    { id: 'windsurf', label: 'Windsurf', detected: opts.detected.includes('windsurf') },
    { id: 'codex', label: 'OpenAI Codex', detected: opts.detected.includes('codex') },
  ]);
  const install = vi.fn(async (clientId: string) => ({
    clientId,
    clientLabel: clientId,
    configPath: `/cfg/${clientId}.json`,
  }));

  const noop = (): void => undefined;
  const asyncNoop = async (): Promise<void> => undefined;
  const ui: WizardUI = {
    setProject: noop,
    setGoal: noop,
    setAuthStatus: noop,
    setAuthDashboardUrl: noop,
    setAuth: noop,
    setAuthFailed: noop,
    setRunPhase: noop,
    setPhase: noop,
    setSkills: noop,
    setMcpCandidates: noop,
    addMcpInstall: (result: McpInstallResult): void => {
      calls.addMcpInstall.push(result);
    },
    finishMcpInstalls: (skipped?: boolean): void => {
      calls.finishMcpInstalls.push(Boolean(skipped));
    },
    setReport: noop,
    setOutroData: noop,
    pushStatus: (message: string, tone?: 'info' | 'ok' | 'error' | 'warn'): void => {
      calls.statuses.push({ message, tone });
    },
    pushTrail: noop,
    pushLiveTail: noop,
    syncTodos: noop,
    awaitBootstrapGate: asyncNoop,
    awaitMcpGate: asyncNoop,
    awaitOutroGate: asyncNoop,
    shutdown: async (): Promise<number> => 0,
  };

  const store = {
    setMcpSelection: vi.fn(),
    session: {
      get: (): {
        mcp: { selectedClientId: string | null; candidates: never[]; installed: McpInstallResult[]; skipped: boolean };
      } => ({
        mcp: { selectedClientId: null, candidates: [], installed: [], skipped: false },
      }),
    },
  } as unknown as WizardStore;

  return {
    ui,
    store,
    installer: { detect, install } as unknown as Harness['installer'],
    calls,
  };
}

function fakeAuth(): ResolvedAuth {
  return {
    secretKey: 'sk_test',
    region: CloudRegionEnum.US,
    source: 'env',
    environmentId: 'env_id',
    environmentName: 'Development',
    apiUrl: 'https://api.novu.test',
    dashboardUrl: 'https://dashboard.novu.test',
  };
}

// Silence the unused import warning for `SkillHost` — kept around so the
// compiler enforces that the literal host strings used in the tests are
// valid members of the union.
const _hosts: SkillHost[] = ['cursor', 'claude', 'agents'];
void _hosts;
