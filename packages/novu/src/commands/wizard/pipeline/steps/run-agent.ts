import {
  buildAutonomousUserMessage,
  buildSDKUserMessage,
  createAgentIterator,
  isMainTurnResult,
  type SDKUserMessage,
} from '../../agent/iterator';
import type { WizardStopHookState } from '../../agent/stop-hook';
import { extractToolLabel, shortenToolName } from '../../agent/tool-labels';
import type { InstalledSkill } from '../../skills/install-skills';
import type { ProjectContext, ResolvedAuth, WizardCommandOptions } from '../../types';
import { buildEditDiff, buildWriteDiff } from '../../ui/markdown/diff';
import { type TodoEntry, TrailKind } from '../../ui/store';
import type { WizardGoal } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';

export interface RunAgentStepInput {
  options: WizardCommandOptions;
  auth: ResolvedAuth;
  project: ProjectContext;
  goal: WizardGoal;
  ui: WizardUI;
  installedSkills: InstalledSkill[];
}

export interface RunAgentStepResult {
  totalMessages: number;
  toolCalls: number;
  errors: number;
  reportFilePath?: string;
}

const REPORT_FILENAME = 'novu-wizard-report.md';

const PRODUCTIVE_TOOL_NAMES = new Set([
  'Write',
  'Edit',
  'mcp__novu__create_workflow',
  'mcp__novu__update_workflow',
  'mcp__novu__create_subscriber',
  'mcp__novu__update_subscriber',
  'mcp__novu__trigger_event',
]);

/**
 * Drives one full autonomous run of the Claude Agent SDK against the user's
 * project. Streams every assistant chunk, tool call, tool result, diff, and
 * `TodoWrite` mutation into the {@link WizardUI} bridge so the live trail and
 * progress lists stay in sync.
 *
 * The runner also maintains a {@link WizardStopHookState} object that the
 * agent's Stop hook reads on every turn-end signal. As `Write`/`Edit`/MCP
 * calls stream in, we update counters; when the agent writes the report we
 * flip `reportWritten = true` so the next `Stop` invocation allows the run
 * to end. Without this, an agent that decides to exit early (e.g. because
 * it saw `Files changed: (none)` would be acceptable) just stops.
 */
export async function runAgentStep(input: RunAgentStepInput): Promise<RunAgentStepResult> {
  const { options, auth, project, goal, ui, installedSkills } = input;
  const result: RunAgentStepResult = { totalMessages: 0, toolCalls: 0, errors: 0 };

  const stopHookState: WizardStopHookState = {
    reportWritten: false,
    toolCallCount: 0,
    productiveCallCount: 0,
  };

  const userMessage = buildAutonomousUserMessage({ goal, project, auth, installedSkills });
  const queue = createSinglePromptQueue(userMessage);
  const handle = await createAgentIterator({
    options,
    auth,
    stopHookState,
    prompt: queue.iterator,
  });

  const toolStartedAt = new Map<string, number>();

  try {
    for await (const message of handle.iterator) {
      result.totalMessages += 1;
      const counters = processSdkMessage(message, ui, toolStartedAt, stopHookState, project.cwd);
      result.toolCalls += counters.toolCalls;
      result.errors += counters.errors;
      if (counters.reportFilePath) result.reportFilePath = counters.reportFilePath;

      if (isMainTurnResult(message)) {
        queue.close();
        break;
      }
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    ui.pushTrail({
      kind: TrailKind.Error,
      id: `er-agent-${Date.now()}`,
      at: Date.now(),
      source: 'agent',
      message: messageText,
      detail: error instanceof Error ? error.stack : undefined,
    });
    ui.pushStatus(messageText, 'error');
    result.errors += 1;
  } finally {
    handle.close();
  }

  return result;
}

interface SinglePromptQueue {
  iterator: AsyncIterableIterator<SDKUserMessage>;
  close: () => void;
}

function createSinglePromptQueue(initialMessage: string): SinglePromptQueue {
  const initial = buildSDKUserMessage(initialMessage);
  let delivered = false;
  let closed = false;

  const iterator: AsyncIterableIterator<SDKUserMessage> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (!delivered) {
        delivered = true;

        return { value: initial, done: false };
      }
      // Indefinitely block until someone closes the queue. The agent SDK
      // expects the prompt iterator to outlive the assistant turn so it can
      // accept follow-up messages. We never send any — the runner closes the
      // queue once the main `result` message comes back.
      return new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
        const interval = setInterval(() => {
          if (!closed) return;
          clearInterval(interval);
          resolve({ value: undefined as unknown as SDKUserMessage, done: true });
        }, 50);
      });
    },
    async return() {
      closed = true;

      return { value: undefined as unknown as SDKUserMessage, done: true };
    },
  };

  return {
    iterator,
    close: () => {
      closed = true;
    },
  };
}

interface MessageCounters {
  toolCalls: number;
  errors: number;
  reportFilePath?: string;
}

function processSdkMessage(
  message: unknown,
  ui: WizardUI,
  toolStartedAt: Map<string, number>,
  stopHookState: WizardStopHookState,
  projectCwd: string
): MessageCounters {
  const counters: MessageCounters = { toolCalls: 0, errors: 0 };
  if (!message || typeof message !== 'object') return counters;

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
    if (!Array.isArray(content)) return counters;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as {
        type?: string;
        text?: string;
        name?: string;
        id?: string;
        input?: Record<string, unknown>;
      };

      if (part.type === 'text' && typeof part.text === 'string' && part.text.length > 0) {
        const id = `a-${Date.now()}`;
        ui.pushTrail({ kind: TrailKind.Assistant, id, at: Date.now(), markdown: part.text });
      } else if (part.type === 'tool_use' && part.name) {
        counters.toolCalls += 1;
        stopHookState.toolCallCount += 1;
        if (PRODUCTIVE_TOOL_NAMES.has(part.name)) {
          stopHookState.productiveCallCount += 1;
        }

        const id = part.id ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const labelInfo = extractToolLabel(part.name, part.input ?? {}, { cwd: projectCwd });
        toolStartedAt.set(id, Date.now());
        ui.pushTrail({
          kind: TrailKind.ToolUse,
          id,
          at: Date.now(),
          toolName: part.name,
          label: labelInfo.short,
          inputSummary: labelInfo.full,
        });
        ui.pushLiveTail(`${shortenToolName(part.name)}${labelInfo.short ? ` · ${labelInfo.short}` : ''}`);

        // Tap TodoWrite — the canonical progress signal (per system prompt).
        if (part.name === 'TodoWrite') {
          const todos = parseTodoWriteInput(part.input);
          if (todos) ui.syncTodos(todos);
        }

        // Tap Write report — record the path for the outro and unblock the
        // Stop hook so the agent is allowed to end the turn.
        if (part.name === 'Write' && typeof part.input?.file_path === 'string') {
          const filePath = part.input.file_path as string;
          if (filePath.endsWith(REPORT_FILENAME)) {
            counters.reportFilePath = filePath;
            stopHookState.reportWritten = true;
          }
        }

        const diff = maybeBuildDiff(id, part.name, part.input ?? {});
        if (diff) ui.pushTrail(diff);
      }
    }

    return counters;
  }

  if (typed.type === 'user' && typed.message?.content && Array.isArray(typed.message.content)) {
    for (const block of typed.message.content as unknown[]) {
      if (!block || typeof block !== 'object') continue;
      const part = block as { type?: string; tool_use_id?: string; is_error?: boolean; content?: unknown };
      if (part.type === 'tool_result' && part.tool_use_id) {
        const isError = !!part.is_error;
        if (isError) {
          counters.errors += 1;
          const detail = extractToolResultText(part.content);
          ui.pushTrail({
            kind: TrailKind.Error,
            id: `er-tool-${Date.now()}`,
            at: Date.now(),
            source: 'tool',
            message: 'tool call failed',
            detail,
          });
        }
      }
    }

    return counters;
  }

  if (typed.type === 'result' && typed.is_error) {
    counters.errors += 1;
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? typed.subtype);
    ui.pushTrail({
      kind: TrailKind.Error,
      id: `er-result-${Date.now()}`,
      at: Date.now(),
      source: 'agent',
      message: detail,
    });
    ui.pushStatus(detail, 'error');

    return counters;
  }

  if (typed.type === 'error' || typed.subtype === 'error' || typed.is_error) {
    counters.errors += 1;
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? message);
    ui.pushStatus(detail, 'error');
  }

  return counters;
}

function parseTodoWriteInput(input: unknown): TodoEntry[] | null {
  if (!input || typeof input !== 'object') return null;
  const raw = (input as { todos?: unknown }).todos;
  if (!Array.isArray(raw)) return null;
  const out: TodoEntry[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as { content?: unknown; activeForm?: unknown; status?: unknown; id?: unknown };
    const content = typeof obj.content === 'string' ? obj.content : undefined;
    const activeForm = typeof obj.activeForm === 'string' ? obj.activeForm : undefined;
    const status = obj.status as TodoEntry['status'] | undefined;
    if (!content || !status) continue;
    const id = typeof obj.id === 'string' ? obj.id : `td-${i}`;
    out.push({ id, content, activeForm, status });
  }

  return out;
}

function maybeBuildDiff(toolId: string, toolName: string, input: Record<string, unknown>) {
  try {
    if (toolName === 'Edit') {
      const filePath = String(input.file_path ?? '');
      const oldString = String(input.old_string ?? '');
      const newString = String(input.new_string ?? '');
      if (!filePath) return null;
      const diff = buildEditDiff(filePath, oldString, newString);

      return {
        kind: TrailKind.Diff,
        id: `diff-${toolId}`,
        at: Date.now(),
        file: filePath,
        patch: diff.patch,
        added: diff.added,
        removed: diff.removed,
      } as const;
    }
    if (toolName === 'Write') {
      const filePath = String(input.file_path ?? '');
      const content = String(input.content ?? '');
      if (!filePath) return null;
      const diff = buildWriteDiff(filePath, content);

      return {
        kind: TrailKind.Diff,
        id: `diff-${toolId}`,
        at: Date.now(),
        file: filePath,
        patch: diff.patch,
        added: diff.added,
        removed: diff.removed,
      } as const;
    }
  } catch {
    return null;
  }

  return null;
}

function formatErrorDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractToolResultText(content: unknown): string | undefined {
  if (typeof content === 'string') {
    const trimmed = content.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as { type?: string; text?: string };
      if (typeof part.text === 'string' && part.text.length > 0) parts.push(part.text);
    }
    const joined = parts.join('\n').trim();

    return joined.length > 0 ? joined : undefined;
  }
  if (content && typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch {
      return undefined;
    }
  }

  return undefined;
}
