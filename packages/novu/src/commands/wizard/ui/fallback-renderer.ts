import chalk from 'chalk';
import prompts from 'prompts';
import {
  buildInitialUserMessage,
  buildSDKUserMessage,
  createAgentIterator,
  isMainTurnResult,
  type SDKUserMessage,
} from '../agent/iterator';
import { extractToolLabel, shortenToolName } from '../agent/tool-labels';
import { resolveAuth } from '../auth/resolve-auth';
import { detectProject } from '../context/detect-project';
import { gatherIntent } from '../context/gather-intent';
import { detectClaudeSettingsConflicts, formatClaudeSettingsConflictMessage } from '../skills/check-claude-settings';
import { getSkillHostDir, installSkills, resolveWizardRuntimeSkillHosts } from '../skills/install-skills';
import type { WizardCommandOptions } from '../types';
import type { AgentRunSummary, MountInkAppParams, MountInkAppResult } from './types';

const REPL_EXIT_COMMANDS = new Set(['/exit', '/quit', 'exit', 'quit', ':q', ':exit']);

export async function runPlainWizard(params: MountInkAppParams): Promise<MountInkAppResult> {
  const { options } = params;
  const summary: AgentRunSummary = { totalMessages: 0, toolCalls: 0, errors: 0 };

  printPlainBanner(options);

  try {
    const auth = await resolveAuth(options);
    params.onTrack?.('Wizard Auth Completed', { source: auth.source });

    const project = detectProject(process.cwd());
    const intent = await gatherIntent(!!options.yes);

    const hosts = resolveWizardRuntimeSkillHosts(process.cwd());
    const skillsResult = installSkills(process.cwd(), { hosts, officialBranch: options.skillsBranch });
    if (skillsResult.installed.length > 0) {
      const dests = Array.from(new Set(skillsResult.installed.map((s) => `${getSkillHostDir(s.host)}/`)))
        .filter(Boolean)
        .join(' and ');
      console.log(chalk.gray(`Installed ${skillsResult.installed.length} Novu skill files under ${dests}`));
    }

    const settingsConflicts = detectClaudeSettingsConflicts(process.cwd());
    if (settingsConflicts.length > 0) {
      console.log(chalk.yellow(`! ${formatClaudeSettingsConflictMessage(settingsConflicts)}`));
    }

    const queue = createPlainPromptQueue(buildInitialUserMessage(intent), () => readPlainReply());

    const handle = await createAgentIterator({
      options,
      auth,
      project,
      intent,
      initialMessage: buildInitialUserMessage(intent),
      prompt: queue.iterator,
    });

    const toolStartTimes = new Map<string, number>();
    let turnStartedAt = Date.now();

    for await (const message of handle.iterator) {
      summary.totalMessages += 1;
      renderPlainMessage(message, summary, toolStartTimes);

      if (isMainTurnResult(message)) {
        const dur = Date.now() - turnStartedAt;
        process.stdout.write(
          `\n${chalk.green('\u2714')} ${chalk.dim(`turn complete in ${formatDuration(dur)} (${summary.toolCalls} tool calls)`)}\n`
        );
        const userInput = await queue.requestNext();
        if (!userInput) break;
        turnStartedAt = Date.now();
      }
    }

    if (options.print) {
      console.log(JSON.stringify({ ok: true, summary }));
    } else {
      console.log(chalk.green('\n\u2714 Novu Wizard session ended.'));
    }

    params.onComplete?.(summary);

    return { exitCode: summary.errors > 0 ? 1 : 0, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Wizard failed: ${friendlyErrorMessage(message)}`));

    return { exitCode: 1, summary };
  }
}

interface PlainPromptQueue {
  iterator: AsyncIterableIterator<SDKUserMessage>;
  requestNext: () => Promise<string | null>;
}

function createPlainPromptQueue(initial: string, reader: () => Promise<string | null>): PlainPromptQueue {
  const queue: SDKUserMessage[] = [buildSDKUserMessage(initial)];
  let resolveNext: ((value: IteratorResult<SDKUserMessage>) => void) | null = null;
  let closed = false;

  return {
    iterator: {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (queue.length > 0) {
          return { value: queue.shift() as SDKUserMessage, done: false };
        }
        if (closed) {
          return { value: undefined as unknown as SDKUserMessage, done: true };
        }

        return new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
          resolveNext = resolve;
        });
      },
      async return() {
        closed = true;

        return { value: undefined as unknown as SDKUserMessage, done: true };
      },
    },
    requestNext: async () => {
      const reply = await reader();
      if (reply === null) {
        closed = true;
        if (resolveNext) {
          const r = resolveNext;
          resolveNext = null;
          r({ value: undefined as unknown as SDKUserMessage, done: true });
        }

        return null;
      }
      const message = buildSDKUserMessage(reply);
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: message, done: false });
      } else {
        queue.push(message);
      }

      return reply;
    },
  };
}

async function readPlainReply(): Promise<string | null> {
  while (true) {
    process.stdout.write(chalk.gray('\n\u2014 reply, or type /exit to end \u2014\n'));

    let cancelled = false;
    const { reply } = await prompts(
      {
        type: 'text',
        name: 'reply',
        message: chalk.cyan('you'),
      },
      {
        onCancel: () => {
          cancelled = true;
        },
      }
    );

    if (cancelled) return null;
    if (typeof reply !== 'string') return null;
    const trimmed = reply.trim();
    if (REPL_EXIT_COMMANDS.has(trimmed.toLowerCase())) return null;
    if (!trimmed) {
      process.stdout.write(chalk.gray('(empty input \u2014 type /exit to end the session)\n'));
      continue;
    }

    return trimmed;
  }
}

function renderPlainMessage(message: unknown, summary: AgentRunSummary, toolStartTimes: Map<string, number>): void {
  if (!message || typeof message !== 'object') return;
  const typed = message as {
    type?: string;
    message?: { content?: unknown };
    subtype?: string;
    result?: string;
    is_error?: boolean;
    errors?: unknown[];
    error?: unknown;
  };

  if (typed.type === 'assistant' && typed.message?.content) {
    const content = typed.message.content;
    if (!Array.isArray(content)) return;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as {
        type?: string;
        text?: string;
        name?: string;
        id?: string;
        input?: Record<string, unknown>;
      };
      if (part.type === 'text' && typeof part.text === 'string') {
        process.stdout.write(`${part.text}\n`);
      } else if (part.type === 'tool_use' && part.name) {
        summary.toolCalls += 1;
        const label = extractToolLabel(part.name, part.input ?? {}).short;
        const id = part.id ?? `t-${summary.toolCalls}`;
        toolStartTimes.set(id, Date.now());
        process.stdout.write(chalk.gray(`\u25b8 ${shortenToolName(part.name)} ${label}\n`));
      }
    }

    return;
  }

  if (typed.type === 'user' && Array.isArray((typed.message as { content?: unknown[] })?.content)) {
    for (const block of (typed.message as { content: unknown[] }).content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as { type?: string; tool_use_id?: string; is_error?: boolean };
      if (part.type === 'tool_result' && part.is_error) {
        summary.errors += 1;
      }
    }

    return;
  }

  if (typed.type === 'result' && typed.is_error) {
    summary.errors += 1;
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? typed.subtype);
    process.stdout.write(chalk.red(`\n[error] ${detail}\n`));

    return;
  }

  if (typed.type === 'error' || typed.subtype === 'error' || typed.is_error) {
    summary.errors += 1;
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? message);
    process.stdout.write(chalk.red(`[error] ${detail}\n`));
  }
}

function printPlainBanner(options: WizardCommandOptions): void {
  const region = options.region.toUpperCase();
  const model = options.model ?? 'claude-sonnet-4-6';
  console.log(chalk.cyan('\n  Novu Wizard ') + chalk.gray('(beta)'));
  console.log(chalk.gray(`  AI-assisted Novu integration wizard \u2014 ${region} \u00b7 ${model}\n`));
}

function friendlyErrorMessage(message: string): string {
  if (message.includes('403')) {
    return 'Novu Wizard is currently in private beta for enterprise customers \u2014 reach out to your Novu CSM to enable it.';
  }
  if (message.includes('404')) {
    return 'Novu Wizard is not available on this Novu deployment. Make sure you are pointed at a Novu Cloud or enterprise instance with the LLM Gateway enabled.';
  }

  return message;
}

function formatErrorDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  return `${minutes}m ${seconds}s`;
}
