import fs from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { MockShellEngine } from './mock-shell.js';
import {
  extractUrls,
  isForbiddenWatcherCommand,
  isKillCommand,
  isOpenCommand,
  RunRecorder,
  shellSummary,
} from './recorder.js';
import type { EvalScenario, ParsedCommand, ScriptedAnswer, Suite } from './types.js';
import { normalizePath } from './types.js';

export type HarnessContext<TParsed = ParsedCommand> = {
  suite: Suite<TParsed>;
  scenario: EvalScenario<TParsed>;
  recorder: RunRecorder;
  engine: MockShellEngine<TParsed>;
  answerIndex: number;
  lastBackgroundShellId?: string;
  env: Record<string, string>;
};

function pickScriptedAnswer<T>(
  scenario: EvalScenario<T>,
  question: string,
  answerIndex: number
): ScriptedAnswer | undefined {
  const remaining = scenario.scriptedAnswers.slice(answerIndex);

  for (const answer of remaining) {
    if (answer.match?.test(question)) {
      return answer;
    }

    if (answer.questionContains && question.toLowerCase().includes(answer.questionContains.toLowerCase())) {
      return answer;
    }
  }

  return remaining[0];
}

async function readFixtureFile(projectRoot: string, filePath: string): Promise<string> {
  const normalized = normalizePath(filePath);
  const resolvedRoot = path.resolve(projectRoot);
  const absolutePath = path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(resolvedRoot, normalized);

  // Segment-safe containment: `path.relative` yields a `..`-prefixed (or absolute)
  // result when the target escapes the root, so sibling roots like `<root>-evil`
  // no longer pass a naive prefix check.
  const relative = path.relative(resolvedRoot, absolutePath);

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to read path outside fixture project: ${filePath}`);
  }

  return fs.readFile(absolutePath, 'utf8');
}

/**
 * Read a single shell value, honoring single quotes, double quotes, and backslash
 * escapes (including the `'\''` idiom agents use to embed apostrophes). Reading stops
 * at the first unquoted whitespace. Returns the decoded value and how many characters
 * were consumed so the caller can find the residual command.
 */
function readShellValue(input: string): { value: string; consumed: number } {
  let out = '';
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === "'") {
      i += 1;
      while (i < input.length && input[i] !== "'") {
        out += input[i];
        i += 1;
      }
      i += 1;
    } else if (ch === '"') {
      i += 1;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i += 1;
        }
        out += input[i];
        i += 1;
      }
      i += 1;
    } else if (ch === '\\') {
      if (i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
      } else {
        i += 1;
      }
    } else if (/\s/.test(ch) || ch === ';' || ch === '&') {
      // Unquoted shell separators end the value so a one-line
      // `export X=foo;npx novu connect …` leaves the connect command as the residual.
      break;
    } else {
      out += ch;
      i += 1;
    }
  }

  return { value: out, consumed: i };
}

/**
 * Capture any leading `export VAR=<value>` assignments into the harness env, then return
 * the residual command (e.g. the `npx novu connect …` that follows). Agents commonly run
 * the playbook's Step 3 block — an `export` plus the connect command — in a single shell
 * call (joined by a newline, `;`, or `&&`); the residual must still execute so the connect
 * command is tracked and streamed. Returns the original command unchanged when it does not
 * start with an export.
 */
function captureLeadingExports(command: string, env: Record<string, string>): string {
  let rest = command;
  let capturedAny = false;

  for (;;) {
    const stripped = rest.replace(/^[\s;&]+/, '');
    const match = stripped.match(/^export\s+([A-Z_][A-Z0-9_]*)=/);

    if (!match?.[1]) {
      break;
    }

    capturedAny = true;
    const afterEq = stripped.slice(match[0].length);
    const { value, consumed } = readShellValue(afterEq);
    env[match[1]] = value;
    rest = afterEq.slice(consumed);
  }

  return capturedAny ? rest.replace(/^[\s;&]+/, '') : command;
}

export function createHarnessTools<TParsed = ParsedCommand>(context: HarnessContext<TParsed>) {
  const Bash = tool({
    description:
      'Executes a bash command. Use run_in_background: true for long-running commands, then poll with BashOutput.',
    inputSchema: z.object({
      command: z.string().describe('The bash command to execute.'),
      run_in_background: z.boolean().optional().describe('Run the command in the background.'),
      description: z.string().optional().describe('Short description of what the command does.'),
    }),
    execute: async ({ command: rawCommand, run_in_background: runInBackground }) => {
      context.recorder.recordToolCall('Bash', { command: rawCommand, run_in_background: runInBackground });

      if (isForbiddenWatcherCommand(rawCommand)) {
        return {
          error: 'Command rejected by harness.',
          stdout: '',
          stderr: 'Do not use sleep/tail/grep watchers. Poll BashOutput on the background shell instead.',
          exitCode: 1,
        };
      }

      // Capture leading `export VAR=…` assignments, then continue with whatever follows
      // (e.g. the connect command in the same block). A pure export block has no residual.
      const command = captureLeadingExports(rawCommand, context.env);

      if (!command) {
        return { stdout: '', stderr: '', exitCode: 0 };
      }

      if (isOpenCommand(command)) {
        const fileMatch = command.match(/["']([^"']+\.png)["']/i) ?? command.match(/\s(\S+\.png)\s*$/i);

        if (fileMatch?.[1]) {
          context.recorder.recordOpenedFile(fileMatch[1]);
        }

        return { stdout: 'Opened image viewer.', stderr: '', exitCode: 0 };
      }

      if (isKillCommand(command)) {
        const shellId = context.lastBackgroundShellId;

        if (shellId) {
          context.engine.killShell(shellId);
          context.recorder.recordKill(shellId);
        }

        return { stdout: shellId ? `Killed shell ${shellId}` : 'No shell to kill.', stderr: '', exitCode: 0 };
      }

      const shell = context.engine.createShell(command, Boolean(runInBackground), context.env);

      if (shell.isTracked) {
        context.recorder.recordTrackedCommand(command);
        context.recorder.recordTrackedShell(shell.id);
        context.lastBackgroundShellId = shell.id;

        if (shell.parsed && context.suite.onTrackedCommand) {
          context.suite.onTrackedCommand(command, shell.parsed, context.recorder);
        }
      }

      if (runInBackground) {
        context.engine.pollShell(shell.id);
        const backgroundStdout = shell.emittedStdout.join('\n');

        for (const url of extractUrls(backgroundStdout)) {
          context.recorder.recordUrl(url);
        }

        return {
          shellId: shell.id,
          stdout: backgroundStdout,
          stderr: '',
          running: !shell.completed,
        };
      }

      context.engine.pollShell(shell.id);

      while (!shell.completed && shell.chunkIndex < shell.chunks.length) {
        context.engine.pollShell(shell.id);
      }

      const stdout = shell.emittedStdout.join('\n');

      for (const url of extractUrls(stdout)) {
        context.recorder.recordUrl(url);
      }

      return { stdout, stderr: '', exitCode: shell.exitCode ?? 0 };
    },
  });

  const BashOutput = tool({
    description: 'Poll stdout/stderr from a background shell started with Bash run_in_background: true.',
    inputSchema: z.object({
      shellId: z.string().describe('Background shell id returned by Bash.'),
    }),
    execute: async ({ shellId }) => {
      context.recorder.recordToolCall('BashOutput', { shellId });

      const shell = context.engine.pollShell(shellId);

      if (!shell) {
        return { error: `Unknown shell id: ${shellId}`, stdout: '', completed: true, exitCode: 1 };
      }

      context.recorder.recordPoll(shellId);

      const stdout = shellSummary(shell);

      for (const url of extractUrls(stdout)) {
        context.recorder.recordUrl(url);
      }

      for (const pattern of context.suite.sentinelFilePatterns ?? []) {
        const match = stdout.match(pattern);

        if (match?.[1]) {
          try {
            // Route through the fixture-root guard: the path is captured from
            // agent-controlled shell output, so an injected absolute path must not
            // escape the scenario workspace.
            const fileContents = await readFixtureFile(context.scenario.projectRoot, match[1]);

            for (const url of extractUrls(fileContents)) {
              context.recorder.recordUrl(url);
            }
          } catch {
            // Sentinel file may not exist (or sits outside the fixture root); ignore.
          }
        }
      }

      return {
        shellId,
        stdout,
        completed: shell.completed,
        exitCode: shell.exitCode,
        killed: shell.killed,
      };
    },
  });

  const AskUserQuestion = tool({
    description: 'Ask the user a structured question with 2-4 options.',
    inputSchema: z.object({
      question: z.string(),
      options: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            description: z.string().optional(),
          })
        )
        .min(2)
        .max(4),
    }),
    execute: async ({ question, options }) => {
      const scripted = pickScriptedAnswer(context.scenario, question, context.answerIndex);
      context.answerIndex += 1;

      const selected =
        options.find((option) => option.id === scripted?.optionId) ??
        options.find((option) => option.label === scripted?.label) ??
        options[0];

      context.recorder.recordToolCall('AskUserQuestion', { question, options }, { selectedId: selected.id });

      return { selectedId: selected.id, selectedLabel: selected.label };
    },
  });

  const Read = tool({
    description: 'Read a file from the project workspace.',
    inputSchema: z.object({
      file_path: z.string(),
    }),
    execute: async ({ file_path: filePath }) => {
      // Record exactly once per call, inside each branch, so a successful read is not
      // logged twice (which would double every `toolCallsNamed(result, 'Read')` count
      // and corrupt the tool-call timeline).
      if (filePath.includes('/tmp/') || filePath.endsWith('.log')) {
        context.recorder.recordToolCall('Read', { file_path: filePath });

        return { error: 'Reading log files is discouraged in this flow.' };
      }

      if (filePath.endsWith('.png')) {
        context.recorder.recordToolCall('Read', { file_path: filePath });

        return { content: '[PNG image omitted by harness]' };
      }

      try {
        const content = await readFixtureFile(context.scenario.projectRoot, filePath);
        context.recorder.recordToolCall('Read', { file_path: filePath }, { bytes: content.length });

        return { content };
      } catch (error) {
        context.recorder.recordToolCall('Read', { file_path: filePath });

        return { error: error instanceof Error ? error.message : 'Failed to read file.' };
      }
    },
  });

  return { Bash, BashOutput, AskUserQuestion, Read };
}

export function createHarnessContext<TParsed = ParsedCommand>(
  suite: Suite<TParsed>,
  scenario: EvalScenario<TParsed>,
  recorder: RunRecorder
): HarnessContext<TParsed> {
  return {
    suite,
    scenario,
    recorder,
    engine: new MockShellEngine<TParsed>(scenario, suite.commandParser),
    answerIndex: 0,
    env: {},
  };
}

export type HarnessTools = ReturnType<typeof createHarnessTools>;
