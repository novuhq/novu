import { parseSubagentBranch } from '../../agent/build-subagent-prompt';
import { cleanupWizardAgents, installWizardAgents } from '../../agent/install-agents';
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
import type {
  AgentRunBranchTiming,
  AgentRunResult,
  BranchResult,
  ProjectContext,
  ResolvedAuth,
  SubagentBranch,
  WizardCommandOptions,
} from '../../types';
import { buildEditDiff, buildWriteDiff } from '../../ui/markdown/diff';
import { type TodoEntry, TrailKind } from '../../ui/store';
import type { WizardGoal } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';
import type { InstallPackagesResult } from './install-packages';
import type { ValidationResult } from './validate';

/**
 * Wall-clock budget for the entire validate → fix → validate loop. Measured
 * across the cumulative duration of every CLI-side `runValidate()` call;
 * the agent's own fix-turn time is uncapped because it's already governed
 * by the SDK's per-message timeout. Tuned empirically: 90s comfortably
 * covers two `pnpm lint` + `tsc` passes on a typical Next.js + Hono mono-
 * repo. Bigger projects will hit this cap and surface remainders in the
 * report — a known failure mode the user can fix manually.
 */
export const WIZARD_FIX_LOOP_BUDGET_MS = 90_000;

/**
 * Optional validate → fix loop the runner attaches to keep the SDK session
 * open across CLI-side validation. When supplied, every `isMainTurnResult`
 * triggers `runValidate()`; failures are formatted via `buildFixPrompt` and
 * pushed back into the same prompt queue so the agent can edit the offend-
 * ing files and end its turn again.
 */
export interface RunAgentFixLoop {
  /** Runs the deterministic CLI-side lint+typecheck pass. */
  runValidate: () => Promise<ValidationResult[]>;
  /** Renders a focused user message instructing the agent to fix the failures. */
  buildFixPrompt: (failures: ValidationResult[], attempt: number) => string;
  /** Cumulative cap on every `runValidate()` call combined. */
  budgetMs: number;
  /** Fired the first time the loop transitions from agent-running → validating. */
  onValidateStart?: () => void;
  /**
   * Fired before each `runValidate()` call (`failures` is `null` on the
   * first call of the attempt, then set with the previous result so the
   * UI hint can read e.g. "Attempt 2 — fixing 3 issue(s)…").
   */
  onValidateAttempt?: (attempt: number, failures: ValidationResult[] | null) => void;
  /** Fired exactly once when the loop exits. */
  onValidateDone?: (final: ValidationResult[], reason: ValidationLoopReason) => void;
}

export type ValidationLoopReason = 'clean' | 'budget' | 'no-fix-loop';

export interface RunAgentStepInput {
  options: WizardCommandOptions;
  auth: ResolvedAuth;
  project: ProjectContext;
  goal: WizardGoal;
  ui: WizardUI;
  installedSkills: InstalledSkill[];
  /**
   * Output of the pre-install step. Threaded into the user prompt as
   * the topology + per-target install outcome so the agent knows which
   * workspaces it can write code into and which packages already
   * resolved on disk.
   */
  installResult?: InstallPackagesResult;
  /**
   * Optional fix-loop hook. Without this, `runAgentStep` keeps its legacy
   * single-turn behaviour: send one user prompt, exit on the first
   * `isMainTurnResult`. With it, the runner orchestrates a validate ↔ fix
   * loop on the same SDK session.
   */
  fixLoop?: RunAgentFixLoop;
}

export interface RunAgentStepResult extends AgentRunResult {
  /** Final validation state after the fix loop terminates. Empty array when clean. */
  validation: ValidationResult[];
  /**
   * 0 = no fix loop ran (config not supplied).
   * 1 = clean on the first pass / budget exhausted before the first fix turn.
   * N>1 = `N-1` fix turns were dispatched.
   */
  validationAttempts: number;
  /** Why the fix loop terminated. */
  validationReason: ValidationLoopReason;
}

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
 * The Claude Agent SDK reports the subagent dispatch tool under two
 * names depending on its preset / version: the `claude_code` preset
 * surfaces it as `Agent`, while older flows / direct API calls use
 * `Task`. Treat both as the same fan-out signal so branch detection,
 * the Stop-hook gate, and the activity trail all stay consistent.
 */
const SUBAGENT_TOOL_NAMES = new Set(['Task', 'Agent']);

/**
 * Drives one full autonomous run of the Claude Agent SDK against the user's
 * project. Streams every assistant chunk, tool call, tool result, diff, and
 * `TodoWrite` mutation into the {@link WizardUI} bridge so the live trail and
 * progress lists stay in sync.
 *
 * The runner orchestrates the parallel-fan-out architecture:
 *
 *  - Every `Task` tool_use whose label matches a wizard branch
 *    (`novu-wizard-inbox` / `novu-wizard-workflows` / `novu-wizard-subscribers`)
 *    increments `stopHookState.branchesDispatched`. The matching `tool_result`
 *    increments `branchesCompleted`. The Stop hook (see
 *    `agent/stop-hook.ts`) blocks the run from ending until every dispatched
 *    branch has completed.
 *  - The main agent's final assistant message is expected to contain a JSON
 *    code block of shape `{ "branches": { ... } }` aggregating each subagent's
 *    structured result. We parse it here and return the branches in
 *    {@link RunAgentStepResult.branches} so the report builder can render
 *    deterministic sections without re-asking the agent.
 */
export async function runAgentStep(input: RunAgentStepInput): Promise<RunAgentStepResult> {
  const { options, auth, project, goal, ui, installedSkills, installResult, fixLoop } = input;
  const agentStartedAt = Date.now();
  const result: RunAgentStepResult = {
    totalMessages: 0,
    toolCalls: 0,
    errors: 0,
    branches: {},
    branchParseFailures: [],
    timings: {
      agentStartedAt,
      agentEndedAt: agentStartedAt,
      branches: [],
    },
    validation: [],
    validationAttempts: 0,
    validationReason: fixLoop ? 'clean' : 'no-fix-loop',
  };

  const stopHookState: WizardStopHookState = {
    toolCallCount: 0,
    productiveCallCount: 0,
    branchesDispatched: 0,
    branchesCompleted: 0,
  };

  /**
   * Pre-render the three subagent prompts to `.claude/agents/*.md` so
   * the SDK's `Task` tool injects them as preset system prompts. The
   * main agent then dispatches with a tiny `prompt` parameter instead
   * of generating the full subagent prompt as model tokens — the
   * dominant cost in the pre-fan-out latency.
   */
  installWizardAgents({ cwd: project.cwd, project, auth, installedSkills });

  const userMessage = buildAutonomousUserMessage({ goal, project, auth, installedSkills, installResult });
  const queue = createPromptQueue(userMessage);
  const handle = await createAgentIterator({
    options,
    auth,
    stopHookState,
    prompt: queue.iterator,
  });

  const toolStartedAt = new Map<string, number>();
  const taskCallBranchById = new Map<string, SubagentBranch>();
  const taskCallStartedAtById = new Map<string, number>();
  /**
   * Per-branch buffer of subagent assistant text. Keyed by the outer
   * `Task` `tool_use_id` (which the SDK echoes as `parent_tool_use_id`
   * on every subagent message). The runner parses each subagent's
   * fenced JSON block out of these buffers when the matching outer
   * `Task` `tool_result` arrives — saves the main agent from having
   * to re-read every subagent's payload back into context just to
   * forward it as an aggregate JSON.
   */
  const subagentTextByTaskId = new Map<string, string[]>();
  const finalAssistantText: string[] = [];

  /**
   * Cumulative wall-clock budget consumed by every `runValidate()` call.
   * The fix loop bails (`reason: 'budget'`) the first time we observe
   * this exceed `fixLoop.budgetMs` AFTER a non-empty failure list — i.e.
   * we always honour the most recent validation result before quitting.
   */
  let consumedBudgetMs = 0;
  let fixLoopStarted = false;

  try {
    for await (const message of handle.iterator) {
      result.totalMessages += 1;
      const counters = processSdkMessage({
        message,
        ui,
        toolStartedAt,
        stopHookState,
        projectCwd: project.cwd,
        taskCallBranchById,
        taskCallStartedAtById,
        branchTimings: result.timings.branches,
        subagentTextByTaskId,
        result,
        finalAssistantText,
      });
      result.toolCalls += counters.toolCalls;
      result.errors += counters.errors;

      if (!isMainTurnResult(message)) continue;

      if (!fixLoop) {
        queue.close();
        break;
      }

      result.validationAttempts += 1;
      if (!fixLoopStarted) {
        fixLoop.onValidateStart?.();
        fixLoopStarted = true;
      }
      fixLoop.onValidateAttempt?.(result.validationAttempts, null);

      const validateStartedAt = Date.now();
      const validateResults = await fixLoop.runValidate();
      consumedBudgetMs += Date.now() - validateStartedAt;
      result.validation = validateResults;
      // `runValidate()` returns one row per (workspace, kind) regardless of
      // exit code so the report can render both "Passed" and "Failures"
      // sections. The fix loop only cares about non-zero exits — without
      // this filter every clean attempt would still spawn a fix prompt and
      // chew through the budget until we time out (the agent shrugs at the
      // exit-0 entries with "no failures to fix" and ends its turn,
      // re-entering the loop indefinitely).
      const failures = validateResults.filter((r) => r.exitCode !== 0);

      if (failures.length === 0) {
        result.validationReason = 'clean';
        queue.close();
        break;
      }

      if (consumedBudgetMs >= fixLoop.budgetMs) {
        result.validationReason = 'budget';
        ui.pushStatus(
          `Validation budget exhausted after ${result.validationAttempts} attempt(s) — ${failures.length} issue(s) remain in the report.`,
          'warn'
        );
        queue.close();
        break;
      }

      fixLoop.onValidateAttempt?.(result.validationAttempts, failures);
      const fixPrompt = fixLoop.buildFixPrompt(failures, result.validationAttempts);
      queue.push(fixPrompt);
      // Intentionally NOT breaking — the SDK iterator will resume yielding
      // messages as soon as the agent picks up the new user prompt, and
      // the next `isMainTurnResult` re-enters this branch.
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
    cleanupWizardAgents(project.cwd);
  }

  result.timings.agentEndedAt = Date.now();
  fixLoop?.onValidateDone?.(result.validation, result.validationReason);

  /**
   * Fallback path: if the main agent still emitted an aggregate JSON
   * block (older system prompt, manual override, etc.), use it to fill
   * branches we did NOT pick up off the subagent stream. Stream-parsed
   * branches always win — they're the canonical source.
   */
  const aggregate = parseAggregateJson(finalAssistantText.join('\n'));
  if (aggregate) {
    for (const [branch, value] of Object.entries(aggregate.branches)) {
      const validBranch = branch as SubagentBranch;
      if (result.branches[validBranch]) continue;
      const normalised = normaliseBranchResult(validBranch, value);
      if (normalised) {
        result.branches[validBranch] = normalised;
      } else {
        result.branchParseFailures.push(validBranch);
      }
    }
  }

  return result;
}

/**
 * Async-queue powering the multi-turn agent loop.
 *
 *  - `iterator`: the source the SDK polls for the next user message.
 *  - `push(content)`: enqueue a follow-up message — wakes a waiting
 *    `next()` immediately or buffers if no consumer is waiting.
 *  - `close()`: signal end-of-input — the iterator yields `{ done: true }`
 *    on its next pull (or right now, if `next()` is already pending).
 *
 * Replaces the legacy 50ms `setInterval` poll: pure promise-based, zero
 * idle CPU between pulls, supports an arbitrary number of follow-up
 * prompts on the same SDK session.
 */
export interface PromptQueue {
  iterator: AsyncIterableIterator<SDKUserMessage>;
  push: (content: string) => void;
  close: () => void;
}

export function createPromptQueue(initialMessage: string): PromptQueue {
  const pending: SDKUserMessage[] = [buildSDKUserMessage(initialMessage)];
  let pendingResolve: ((result: IteratorResult<SDKUserMessage>) => void) | null = null;
  let closed = false;

  const doneResult: IteratorResult<SDKUserMessage> = {
    value: undefined as unknown as SDKUserMessage,
    done: true,
  };

  const iterator: AsyncIterableIterator<SDKUserMessage> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      const next = pending.shift();
      if (next) return { value: next, done: false };
      if (closed) return doneResult;

      return new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
        pendingResolve = resolve;
      });
    },
    async return() {
      closed = true;
      const resolver = pendingResolve;
      pendingResolve = null;
      resolver?.(doneResult);

      return doneResult;
    },
  };

  return {
    iterator,
    push: (content: string) => {
      if (closed) return;
      const message = buildSDKUserMessage(content);
      const resolver = pendingResolve;
      if (resolver) {
        pendingResolve = null;
        resolver({ value: message, done: false });

        return;
      }
      pending.push(message);
    },
    close: () => {
      if (closed) return;
      closed = true;
      const resolver = pendingResolve;
      pendingResolve = null;
      resolver?.(doneResult);
    },
  };
}

interface MessageCounters {
  toolCalls: number;
  errors: number;
}

interface ProcessSdkMessageInput {
  message: unknown;
  ui: WizardUI;
  toolStartedAt: Map<string, number>;
  stopHookState: WizardStopHookState;
  projectCwd: string;
  taskCallBranchById: Map<string, SubagentBranch>;
  /**
   * `Task` `tool_use_id` → `Date.now()` at the moment the main agent
   * dispatched it. Paired with the matching outer `tool_result` to
   * compute per-branch wall-clock; surfaced under `--debug` by the
   * runner.
   */
  taskCallStartedAtById: Map<string, number>;
  /**
   * Per-branch start / end timestamps, mutated in place. Same array
   * reference lives on `result.timings.branches` so the runner can
   * forward it to the timing summary without an extra copy.
   */
  branchTimings: AgentRunBranchTiming[];
  /**
   * Buffer of subagent assistant text keyed by outer `Task`
   * `tool_use_id`. Mutated as subagent assistant messages stream
   * through; drained when the matching outer `tool_result` fires.
   */
  subagentTextByTaskId: Map<string, string[]>;
  /**
   * Same `AgentRunResult` reference the caller is building. Populated
   * here as soon as we see each subagent's outer `Task` `tool_result`,
   * so the report writer doesn't need a separate aggregate from the
   * main agent.
   */
  result: AgentRunResult;
  finalAssistantText: string[];
}

function processSdkMessage(input: ProcessSdkMessageInput): MessageCounters {
  const {
    message,
    ui,
    toolStartedAt,
    stopHookState,
    projectCwd,
    taskCallBranchById,
    taskCallStartedAtById,
    branchTimings,
    subagentTextByTaskId,
    result,
    finalAssistantText,
  } = input;
  const counters: MessageCounters = { toolCalls: 0, errors: 0 };
  if (!message || typeof message !== 'object') return counters;

  const typed = message as {
    type?: string;
    parent_tool_use_id?: string | null;
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

    const isMainAssistant = !typed.parent_tool_use_id;
    const parentBranch =
      typeof typed.parent_tool_use_id === 'string' ? taskCallBranchById.get(typed.parent_tool_use_id) : undefined;

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
        if (isMainAssistant) {
          finalAssistantText.push(part.text);
        } else if (typeof typed.parent_tool_use_id === 'string') {
          /**
           * Subagent assistant text — buffer it under the outer Task's
           * id so we can extract the final fenced JSON block when the
           * matching outer `tool_result` arrives.
           */
          const bucket = subagentTextByTaskId.get(typed.parent_tool_use_id);
          if (bucket) {
            bucket.push(part.text);
          } else {
            subagentTextByTaskId.set(typed.parent_tool_use_id, [part.text]);
          }
        }
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
          branch: parentBranch,
        });
        const branchTag = parentBranch ? `[${parentBranch}] ` : '';
        ui.pushLiveTail(`${branchTag}${shortenToolName(part.name)}${labelInfo.short ? ` · ${labelInfo.short}` : ''}`);

        if (part.name === 'TodoWrite') {
          const todos = parseTodoWriteInput(part.input);
          if (todos) ui.syncTodos(todos);
        }

        if (SUBAGENT_TOOL_NAMES.has(part.name) && isMainAssistant) {
          const branch = detectTaskBranch(part.input);
          if (branch) {
            taskCallBranchById.set(id, branch);
            taskCallStartedAtById.set(id, Date.now());
            stopHookState.branchesDispatched += 1;
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

        const branch = taskCallBranchById.get(part.tool_use_id);
        if (branch) {
          stopHookState.branchesCompleted += 1;
          const startedAt = taskCallStartedAtById.get(part.tool_use_id) ?? Date.now();
          branchTimings.push({ branch, startedAt, endedAt: Date.now() });
          taskCallBranchById.delete(part.tool_use_id);
          taskCallStartedAtById.delete(part.tool_use_id);

          /**
           * Parse the subagent's structured JSON directly off the
           * stream. The subagent prompt's "Final message contract"
           * (see `agent/build-subagent-prompt.ts`) tells each branch
           * to end its final message with a fenced JSON code block;
           * we look for the LAST such block in the buffered text.
           * If the subagent failed to produce one, fall back to the
           * tool_result content (the SDK echoes the subagent's final
           * message there) and finally to the main-agent aggregate.
           */
          const buffered = subagentTextByTaskId.get(part.tool_use_id);
          subagentTextByTaskId.delete(part.tool_use_id);
          const candidates: string[] = [];
          if (buffered && buffered.length > 0) candidates.push(buffered.join('\n'));
          const resultText = extractToolResultText(part.content);
          if (resultText) candidates.push(resultText);
          let parsed: BranchResult | null = null;
          for (const text of candidates) {
            const raw = parseSingleBranchJson(text);
            if (!raw) continue;
            parsed = normaliseBranchResult(branch, raw);
            if (parsed) break;
          }
          if (parsed) {
            result.branches[branch] = parsed;
          } else if (candidates.length > 0) {
            result.branchParseFailures.push(branch);
          }
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

function detectTaskBranch(input: unknown): SubagentBranch | null {
  if (!input || typeof input !== 'object') return null;
  const data = input as Record<string, unknown>;
  const subagentType = typeof data.subagent_type === 'string' ? data.subagent_type : undefined;
  const description = typeof data.description === 'string' ? data.description : undefined;
  const prompt = typeof data.prompt === 'string' ? data.prompt : undefined;

  return parseSubagentBranch(subagentType) ?? parseSubagentBranch(description) ?? parseSubagentBranch(prompt);
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

/**
 * Pulls the `{ "branches": { ... } }` JSON aggregate out of the main agent's
 * final assistant text. The agent is instructed to wrap the aggregate in a
 * fenced code block at the end of its message; we look for any fenced block
 * that parses as JSON containing a `branches` object and prefer the last
 * one (mirroring the prompt's "very last thing" rule). When the agent omits
 * the aggregate entirely, this returns `null` and the caller falls back to
 * building each branch's report sections from the trail.
 */
function parseAggregateJson(text: string): { branches: Record<string, unknown> } | null {
  if (!text) return null;
  const fenceRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  let last: { branches: Record<string, unknown> } | null = null;
  for (;;) {
    const match = fenceRegex.exec(text);
    if (!match) break;
    const parsed = tryParse(match[1]);
    if (parsed) last = parsed;
  }
  if (last) return last;

  return tryParse(text);
}

function tryParse(snippet: string): { branches: Record<string, unknown> } | null {
  const trimmed = snippet.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const branches = (parsed as { branches?: unknown }).branches;
    if (!branches || typeof branches !== 'object') return null;

    return { branches: branches as Record<string, unknown> };
  } catch {
    return null;
  }
}

/**
 * Pulls a single subagent's branch JSON out of its final assistant
 * message text. The contract in `agent/build-subagent-prompt.ts`
 * (`renderJsonContract`) tells every subagent to end its final message
 * with a fenced JSON code block holding `{ branch, filesChanged, ... }`
 * — we prefer the LAST such block (mirroring the prompt's "very last
 * thing" rule) and fall back to plain JSON parsing if the block isn't
 * fenced.
 */
function parseSingleBranchJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const fenceRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  let last: Record<string, unknown> | null = null;
  for (;;) {
    const match = fenceRegex.exec(text);
    if (!match) break;
    const parsed = tryParseBranchObject(match[1]);
    if (parsed) last = parsed;
  }
  if (last) return last;

  return tryParseBranchObject(text);
}

function tryParseBranchObject(snippet: string): Record<string, unknown> | null {
  const trimmed = snippet.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    /**
     * Heuristic: a branch object has at least `branch` or one of the
     * structured arrays the subagent contract requires. Without this
     * we'd accidentally accept arbitrary `{...}` blocks the model
     * happens to emit (e.g. example snippets).
     */
    const obj = parsed as Record<string, unknown>;
    if (
      'branch' in obj ||
      'filesChanged' in obj ||
      'workflowsCreated' in obj ||
      'triggersWired' in obj ||
      'subscriberSyncPoints' in obj
    ) {
      return obj;
    }

    return null;
  } catch {
    return null;
  }
}

function normaliseBranchResult(branch: SubagentBranch, raw: unknown): BranchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const result: BranchResult = {
    branch,
    filesChanged: arrayOf(data.filesChanged, (item) => {
      const obj = asObject(item);
      const path = stringField(obj?.path);
      const kindCandidate = stringField(obj?.kind);
      const kind = kindCandidate === 'created' || kindCandidate === 'edited' ? kindCandidate : 'edited';

      return path ? { path, kind } : null;
    }),
    workflowsCreated: arrayOf(data.workflowsCreated, (item) => {
      const obj = asObject(item);
      const id = stringField(obj?.id);
      const trigger = stringField(obj?.trigger) ?? '';
      const kindCandidate = stringField(obj?.kind);
      const kind = kindCandidate === 'code-first' || kindCandidate === 'mcp' ? kindCandidate : 'mcp';

      return id ? { id, trigger, kind } : null;
    }),
    triggersWired: arrayOf(data.triggersWired, (item) => {
      const obj = asObject(item);
      const workflowId = stringField(obj?.workflowId);
      const serverFile = stringField(obj?.serverFile) ?? '';
      const uiFile = stringField(obj?.uiFile) ?? '';

      return workflowId ? { workflowId, serverFile, uiFile } : null;
    }),
    subscriberSyncPoints: arrayOf(data.subscriberSyncPoints, (item) => {
      const obj = asObject(item);
      const file = stringField(obj?.file);
      const hookCandidate = stringField(obj?.hook);
      const hook =
        hookCandidate === 'sign-up' || hookCandidate === 'sign-in' || hookCandidate === 'profile-update'
          ? hookCandidate
          : 'sign-up';

      return file ? { file, hook } : null;
    }),
    manualTriggersNeeded: arrayOf(data.manualTriggersNeeded, (item) => {
      const obj = asObject(item);
      const workflowId = stringField(obj?.workflowId);
      const reason = stringField(obj?.reason) ?? '';

      return workflowId ? { workflowId, reason } : null;
    }),
    notes: arrayOf(data.notes, (item) => (typeof item === 'string' && item.trim().length > 0 ? item.trim() : null)),
  };

  return result;
}

function arrayOf<T>(value: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const mapped = mapper(item);
    if (mapped !== null && mapped !== undefined) out.push(mapped);
  }

  return out;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
