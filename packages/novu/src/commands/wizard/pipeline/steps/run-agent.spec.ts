import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';
import type { WizardUI } from '../../ui/wizard-ui';
import { createPromptQueue, runAgentStep } from './run-agent';
import type { ValidationResult } from './validate';

vi.mock('../../agent/install-agents', () => ({
  installWizardAgents: vi.fn(),
  cleanupWizardAgents: vi.fn(),
}));

vi.mock('../../agent/iterator', async () => {
  const actual = await vi.importActual<typeof import('../../agent/iterator')>('../../agent/iterator');

  return {
    ...actual,
    createAgentIterator: vi.fn(),
    buildAutonomousUserMessage: vi.fn(() => 'initial prompt'),
  };
});

import { createAgentIterator } from '../../agent/iterator';

describe('createPromptQueue', () => {
  it('delivers the initial message and waits for follow-ups before closing', async () => {
    const queue = createPromptQueue('hello');

    const first = await queue.iterator.next();
    expect(first.done).toBe(false);
    expect(first.value?.message.content).toBe('hello');

    const pending = queue.iterator.next();
    queue.push('world');
    const second = await pending;
    expect(second.done).toBe(false);
    expect(second.value?.message.content).toBe('world');

    const closing = queue.iterator.next();
    queue.close();
    const third = await closing;
    expect(third.done).toBe(true);
  });

  it('buffers pushes that arrive before next() is called', async () => {
    const queue = createPromptQueue('first');
    queue.push('second');
    queue.push('third');

    const a = await queue.iterator.next();
    const b = await queue.iterator.next();
    const c = await queue.iterator.next();

    expect(a.value?.message.content).toBe('first');
    expect(b.value?.message.content).toBe('second');
    expect(c.value?.message.content).toBe('third');
  });

  it('returns done after close() and ignores subsequent pushes', async () => {
    const queue = createPromptQueue('first');
    await queue.iterator.next();

    queue.close();
    queue.push('ignored');

    const next = await queue.iterator.next();
    expect(next.done).toBe(true);
  });

  it('resolves a pending next() when close() races with the consumer', async () => {
    const queue = createPromptQueue('first');
    await queue.iterator.next();

    const pending = queue.iterator.next();
    queue.close();
    const result = await pending;
    expect(result.done).toBe(true);
  });
});

/**
 * Drive `runAgentStep`'s validate ↔ fix loop without going through the
 * Claude Agent SDK. The mocked `createAgentIterator` pulls one user
 * message off the runner's prompt queue and yields a synthetic
 * `type: 'result'` message — that's all `isMainTurnResult` needs to
 * decide a turn ended. The runner then re-enters the validate block,
 * and we assert what it does with the fake validation results.
 */
describe('runAgentStep validate loop', () => {
  beforeEach(() => {
    vi.mocked(createAgentIterator).mockReset();
  });

  it("treats a fully-passing validation as 'clean' even when the result array is non-empty", async () => {
    const runValidate = vi
      .fn<[], Promise<ValidationResult[]>>()
      .mockResolvedValueOnce([passing('@app/api', 'typecheck'), passing('@app/web', 'typecheck')]);

    vi.mocked(createAgentIterator).mockImplementationOnce(({ prompt }) => {
      return Promise.resolve({
        iterator: drainPromptThenYieldResult(prompt),
        interrupt: () => Promise.resolve(),
        close: () => undefined,
      });
    });

    const buildFixPrompt = vi.fn(() => 'fix me');

    const result = await runAgentStep({
      options: fakeOptions(),
      auth: fakeAuth(),
      project: fakeProject(),
      goal: 'full',
      ui: fakeUI(),
      installedSkills: [],
      installResult: undefined,
      fixLoop: {
        runValidate,
        buildFixPrompt,
        budgetMs: 90_000,
      },
    });

    expect(result.validationReason).toBe('clean');
    expect(result.validationAttempts).toBe(1);
    expect(buildFixPrompt).not.toHaveBeenCalled();
    expect(runValidate).toHaveBeenCalledTimes(1);
    // Full results are preserved on `validation` so the report writer can
    // still render the "Passed" section.
    expect(result.validation).toHaveLength(2);
  });

  it('pushes a fix prompt when failures are present and exits clean once they go away', async () => {
    const runValidate = vi
      .fn<[], Promise<ValidationResult[]>>()
      .mockResolvedValueOnce([passing('@app/api', 'typecheck'), failing('@app/web', 'typecheck', 2)])
      .mockResolvedValueOnce([passing('@app/api', 'typecheck'), passing('@app/web', 'typecheck')]);

    vi.mocked(createAgentIterator).mockImplementationOnce(({ prompt }) => {
      return Promise.resolve({
        iterator: drainPromptThenYieldResult(prompt),
        interrupt: () => Promise.resolve(),
        close: () => undefined,
      });
    });

    const buildFixPrompt = vi.fn(
      (failures: ValidationResult[], attempt: number) => `fix-${attempt}-${failures.length}`
    );

    const result = await runAgentStep({
      options: fakeOptions(),
      auth: fakeAuth(),
      project: fakeProject(),
      goal: 'full',
      ui: fakeUI(),
      installedSkills: [],
      installResult: undefined,
      fixLoop: {
        runValidate,
        buildFixPrompt,
        budgetMs: 90_000,
      },
    });

    expect(result.validationAttempts).toBe(2);
    expect(result.validationReason).toBe('clean');
    // Only the failing rows should reach the fix prompt — never the
    // exit-0 rows, otherwise the agent shrugs and we waste a turn.
    expect(buildFixPrompt).toHaveBeenCalledTimes(1);
    const [failuresArg] = buildFixPrompt.mock.calls[0];
    expect(failuresArg).toHaveLength(1);
    expect(failuresArg[0].workspace).toBe('@app/web');
    expect(failuresArg[0].exitCode).toBe(2);
  });

  it("exits with 'budget' only when real failures remain after exhausting the wall-clock", async () => {
    const runValidate = vi
      .fn<[], Promise<ValidationResult[]>>()
      .mockResolvedValueOnce([failing('@app/web', 'typecheck', 2)])
      .mockResolvedValueOnce([failing('@app/web', 'typecheck', 2)]);

    vi.mocked(createAgentIterator).mockImplementationOnce(({ prompt }) => {
      return Promise.resolve({
        iterator: drainPromptThenYieldResult(prompt),
        interrupt: () => Promise.resolve(),
        close: () => undefined,
      });
    });

    const result = await runAgentStep({
      options: fakeOptions(),
      auth: fakeAuth(),
      project: fakeProject(),
      goal: 'full',
      ui: fakeUI(),
      installedSkills: [],
      installResult: undefined,
      fixLoop: {
        // Tiny budget — exhausted after the first call.
        budgetMs: 0,
        runValidate,
        buildFixPrompt: () => 'fix me',
      },
    });

    expect(result.validationReason).toBe('budget');
    expect(result.validationAttempts).toBe(1);
    expect(result.validation).toHaveLength(1);
    expect(result.validation[0].exitCode).toBe(2);
  });
});

function passing(workspace: string, kind: ValidationResult['kind']): ValidationResult {
  return {
    workspace,
    cwd: `/proj/${workspace}`,
    kind,
    scriptName: kind === 'lint' ? 'lint' : 'check-types',
    command: `pnpm run ${kind === 'lint' ? 'lint' : 'check-types'}`,
    exitCode: 0,
    durationMs: 1_000,
    stdoutTail: '',
    stderrTail: '',
    timedOut: false,
  };
}

function failing(workspace: string, kind: ValidationResult['kind'], exitCode: number): ValidationResult {
  return {
    ...passing(workspace, kind),
    exitCode,
    stderrTail: 'error TS2322: Type mismatch',
  };
}

/**
 * Tiny stand-in for the real SDK iterator. Pulls a single user message
 * off the prompt queue and yields one `type: 'result'` envelope —
 * enough for `isMainTurnResult` to fire and re-enter the validate
 * block. Loops until the runner closes the queue (clean / budget
 * branch), at which point it ends.
 */
function drainPromptThenYieldResult(prompt: AsyncIterable<unknown>): AsyncIterable<unknown> {
  const iterator = (prompt as AsyncIterableIterator<unknown>)[Symbol.asyncIterator]
    ? (prompt as AsyncIterableIterator<unknown>)[Symbol.asyncIterator]()
    : (prompt as AsyncIterableIterator<unknown>);

  return (async function* (): AsyncGenerator<unknown> {
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      yield { type: 'result', parent_tool_use_id: null as string | null };
    }
  })();
}

function fakeOptions() {
  return {
    apiUrl: 'https://api.novu.co',
    dashboardUrl: 'https://dashboard.novu.co',
    region: CloudRegionEnum.US,
  };
}

function fakeAuth() {
  return {
    secretKey: 'sk_test',
    environmentId: 'env_test',
    apiUrl: 'https://api.novu.co',
    dashboardUrl: 'https://dashboard.novu.co',
    region: CloudRegionEnum.US,
    source: 'env' as const,
  };
}

function fakeProject() {
  return {
    cwd: '/proj',
    rootPackageJsonPath: null,
    packageManager: 'pnpm' as const,
    hasTypeScript: true,
    topology: {
      hasFullstack: false,
      hasWeb: false,
      hasApi: false,
      targets: [],
    },
  } as unknown as import('../../types').ProjectContext;
}

function fakeUI(): WizardUI {
  const noop = (): void => undefined;
  const asyncNoop = async (): Promise<void> => undefined;
  // Cast away from the full WizardUI surface — only a small subset of
  // these is invoked from `runAgentStep` and the empty methods are safe
  // no-ops for the test harness.
  return {
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
    addMcpInstall: noop,
    finishMcpInstalls: noop,
    setReport: noop,
    setOutroData: noop,
    pushStatus: noop,
    pushTrail: noop,
    pushLiveTail: noop,
    syncTodos: noop,
    awaitBootstrapGate: asyncNoop,
    awaitMcpGate: asyncNoop,
    awaitOutroGate: asyncNoop,
    shutdown: async () => 0,
  } as WizardUI;
}
