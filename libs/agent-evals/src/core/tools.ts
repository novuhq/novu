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
  const absolutePath = path.isAbsolute(normalized) ? path.normalize(normalized) : path.resolve(projectRoot, normalized);

  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error(`Refusing to read path outside fixture project: ${filePath}`);
  }

  return fs.readFile(absolutePath, 'utf8');
}

function captureExportedEnv(command: string, env: Record<string, string>): boolean {
  const match = command.match(/^export\s+([A-Z_][A-Z0-9_]*)='([^']*)'/);

  if (match?.[1]) {
    env[match[1]] = match[2] ?? '';

    return true;
  }

  return false;
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
    execute: async ({ command, run_in_background: runInBackground }) => {
      context.recorder.recordToolCall('Bash', { command, run_in_background: runInBackground });

      if (isForbiddenWatcherCommand(command)) {
        return {
          error: 'Command rejected by harness.',
          stdout: '',
          stderr: 'Do not use sleep/tail/grep watchers. Poll BashOutput on the background shell instead.',
          exitCode: 1,
        };
      }

      if (captureExportedEnv(command, context.env)) {
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
      context.recorder.recordPoll(shellId);

      const shell = context.engine.pollShell(shellId);

      if (!shell) {
        return { error: `Unknown shell id: ${shellId}`, stdout: '', completed: true, exitCode: 1 };
      }

      const stdout = shellSummary(shell);

      for (const url of extractUrls(stdout)) {
        context.recorder.recordUrl(url);
      }

      for (const pattern of context.suite.sentinelFilePatterns ?? []) {
        const match = stdout.match(pattern);

        if (match?.[1]) {
          try {
            const fileContents = await fs.readFile(match[1], 'utf8');

            for (const url of extractUrls(fileContents)) {
              context.recorder.recordUrl(url);
            }
          } catch {
            // Sentinel file may not exist in a fixture; ignore.
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
      context.recorder.recordToolCall('Read', { file_path: filePath });

      if (filePath.includes('/tmp/') || filePath.endsWith('.log')) {
        return { error: 'Reading log files is discouraged in this flow.' };
      }

      if (filePath.endsWith('.png')) {
        return { content: '[PNG image omitted by harness]' };
      }

      try {
        const content = await readFixtureFile(context.scenario.projectRoot, filePath);
        context.recorder.recordToolCall('Read', { file_path: filePath }, { bytes: content.length });

        return { content };
      } catch (error) {
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
