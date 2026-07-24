import { describe, expect, it } from 'vitest';
import { MockShellEngine } from './mock-shell.js';
import type { CommandParser, EvalScenario } from './types.js';

type Flags = { token?: string };

const parser: CommandParser<Flags> = {
  matches: (command) => /\bconnect\b/.test(command),
  parse: (command) => ({ token: /--slack-config-token\b/.test(command) ? 'xoxe' : undefined }),
};

function scenario(): EvalScenario<Flags> {
  return {
    id: 'pending-shell',
    category: 'test',
    description: '',
    userPrompt: '',
    projectRoot: '/tmp',
    scriptedAnswers: [],
    tape: {
      chunks: [{ stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.test' }],
      exitCode: 0,
      pendingWhen: (flags) => !flags.token,
    },
  };
}

describe('MockShellEngine pendingWhen', () => {
  it('keeps a pending (no-token) shell running until it is killed', () => {
    const engine = new MockShellEngine(scenario(), parser);
    const shell = engine.createShell('novu connect', true, {});

    // Drain every chunk; a pending branch must not auto-complete.
    engine.pollShell(shell.id);
    engine.pollShell(shell.id);
    engine.pollShell(shell.id);

    expect(shell.exitCode).toBeNull();
    expect(shell.completed).toBe(false);

    engine.killShell(shell.id);

    expect(shell.completed).toBe(true);
    expect(shell.killed).toBe(true);
  });

  it('completes a non-pending (token) shell after its chunks are emitted', () => {
    const engine = new MockShellEngine(scenario(), parser);
    const shell = engine.createShell('novu connect --slack-config-token xoxe', true, {});

    engine.pollShell(shell.id);
    engine.pollShell(shell.id);

    expect(shell.exitCode).toBe(0);
    expect(shell.completed).toBe(true);
  });
});
