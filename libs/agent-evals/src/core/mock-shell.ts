import type { CommandParser, EvalScenario, MockShellState, ParsedCommand, Tape } from './types.js';

function selectTapeChunks<TParsed>(tape: Tape<TParsed>, parsed: TParsed): string[] {
  const selected: string[] = [];

  for (const chunk of tape.chunks) {
    if (chunk.when && !chunk.when(parsed)) {
      continue;
    }

    selected.push(chunk.stdout);
  }

  return selected;
}

/**
 * Replays a scripted CLI "tape" across background-shell polls. The suite's
 * CommandParser decides which commands are "tracked" (e.g. `novu connect`) and
 * how to parse them; the scenario's tape supplies the stdout chunks and
 * optional validation.
 */
export class MockShellEngine<TParsed = ParsedCommand> {
  private shells = new Map<string, MockShellState<TParsed>>();
  private shellCounter = 0;

  constructor(
    private readonly scenario: EvalScenario<TParsed>,
    private readonly parser: CommandParser<TParsed>
  ) {}

  createShell(command: string, runInBackground: boolean, env: Record<string, string>): MockShellState<TParsed> {
    this.shellCounter += 1;
    const id = `shell-${this.shellCounter}`;
    const isTracked = this.parser.matches(command);

    let parsed: TParsed | null = null;
    let parseError: string | null = null;

    if (isTracked) {
      try {
        parsed = this.parser.parse(command, env);
      } catch (error) {
        parseError = error instanceof Error ? error.message : String(error);
      }
    }

    let chunks: string[] = [];
    let exitCode: number | null = null;

    if (isTracked && parseError) {
      chunks = [`✗ Failed to parse tracked command: ${parseError}`];
      exitCode = 1;
    } else if (isTracked && parsed !== null && this.scenario.tape) {
      const validationError = this.scenario.tape.validate?.(parsed) ?? null;

      if (validationError) {
        chunks = [`✗ ${validationError}`];
        exitCode = 1;
      } else {
        chunks = selectTapeChunks(this.scenario.tape, parsed);
        // A pending branch keeps the shell running (exitCode null) until it is killed,
        // so `pollShell` never marks it completed on its own.
        exitCode = this.scenario.tape.pendingWhen?.(parsed) ? null : (this.scenario.tape.exitCode ?? 0);
      }
    } else if (isTracked && !this.scenario.tape) {
      chunks = ['✗ Tracked command was not expected for this scenario.'];
      exitCode = 1;
    } else if (!runInBackground) {
      chunks = [`Executed: ${command}`];
      exitCode = 0;
    } else {
      chunks = [`Background process started: ${command}`];
      exitCode = null;
    }

    const shell: MockShellState<TParsed> = {
      id,
      command,
      parsed,
      isTracked,
      chunks,
      emittedStdout: [],
      chunkIndex: 0,
      exitCode,
      completed: false,
      killed: false,
    };

    this.shells.set(id, shell);

    return shell;
  }

  pollShell(shellId: string): MockShellState<TParsed> | null {
    const shell = this.shells.get(shellId);

    if (!shell || shell.killed) {
      return shell ?? null;
    }

    if (shell.chunkIndex < shell.chunks.length) {
      const nextChunk = shell.chunks[shell.chunkIndex];
      shell.emittedStdout.push(nextChunk);
      shell.chunkIndex += 1;
    }

    if (shell.chunkIndex >= shell.chunks.length && shell.exitCode !== null) {
      shell.completed = true;
    }

    return shell;
  }

  killShell(shellId: string): boolean {
    const shell = this.shells.get(shellId);

    if (!shell) {
      return false;
    }

    shell.killed = true;
    shell.completed = true;
    shell.exitCode = shell.exitCode ?? 143;

    return true;
  }

  getShell(shellId: string): MockShellState<TParsed> | undefined {
    return this.shells.get(shellId);
  }

  listShells(): Array<MockShellState<TParsed>> {
    return [...this.shells.values()];
  }
}
