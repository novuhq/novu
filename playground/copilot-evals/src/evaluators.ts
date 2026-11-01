import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from 'langsmith';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Run } from 'langsmith/schemas';
import type { Expectation, StepCheck } from './dataset.ts';
import type { TurnResult, WorkflowSummary } from './novu.ts';

export type TargetOutputs = {
  chatId?: string;
  workflow: WorkflowSummary | null;
  turns: (TurnResult & { prompt: string; focusedStepId?: string; seconds: number })[];
  /** Tool names in call order across all turns, for eyeballing in the compare view. */
  toolSequence: string[];
  /** Set when the run itself failed (HTTP error, timeout) rather than Copilot doing the wrong thing. */
  error?: string;
};

type EvaluatorArgs = { outputs: Record<string, any>; referenceOutputs?: Record<string, any> };

const score = (key: string, passed: boolean, comment?: string): EvaluationResult => ({
  key,
  score: passed ? 1 : 0,
  comment,
});

const lower = (value: unknown) => JSON.stringify(value ?? null).toLowerCase();

const missingFrom = (actual: string[], expected: string[]) => expected.filter((item) => !actual.includes(item));

const sortKeys = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
    : value;

/** JSON with object keys sorted, so equal values serialize alike whatever their key order. */
const stableJson = (value: unknown): string | undefined =>
  JSON.stringify(value, (_key, nested: unknown) => sortKeys(nested));

const normalizeText = (text: string) => text.trim().replace(/\{\{\s*(.*?)\s*\}\}/g, '{{$1}}');

/** How `StepCheck.fields` compares values: like `stableJson`, with every string run through `normalizeText`. */
const fieldJson = (value: unknown) =>
  JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === 'string' ? normalizeText(nested) : sortKeys(nested)
  );

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const isKeyValueList = (value: unknown): value is { key: string; value: unknown }[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'object' && item !== null && typeof item.key === 'string' && 'value' in item);

/** What a path segment indexes into: objects as they are, `[{ key, value }]` lists by key, JSON strings parsed. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') return asRecord(parseJson(value));
  if (isKeyValueList(value)) return Object.fromEntries(value.map((pair) => [pair.key, pair.value]));
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;

  return undefined;
}

const valueAt = (controlValues: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>((current, segment) => asRecord(current)?.[segment], controlValues);

/** The expected paths whose values differ, each as `path is <actual>, expected <value>`. */
function fieldMismatches(controlValues: Record<string, unknown>, expected: Record<string, unknown>): string[] {
  return Object.entries(expected).flatMap(([path, value]) => {
    const actual = valueAt(controlValues, path);
    if (fieldJson(actual) === fieldJson(value)) return [];
    const got = actual === undefined ? 'missing' : (stableJson(actual) ?? '').slice(0, 120);

    return [`${path} is ${got}, expected ${JSON.stringify(value)}`];
  });
}

function hasCondition(skip: unknown): boolean {
  if (skip === null || skip === undefined || skip === false) return false;

  return typeof skip !== 'object' || Object.keys(skip).length > 0;
}

/** Returns why the step fails the check, or nothing when it passes. */
function stepCheckFailure(workflow: WorkflowSummary, check: StepCheck): string | undefined {
  const nth = check.nth ?? 0;
  const step = workflow.steps.filter((candidate) => candidate.type === check.type)[nth];
  const label = `${check.type}[${nth}]`;
  if (!step) return `${label}: no such step`;

  const { controlValues } = step;
  const content = lower(controlValues);
  const missingText = (check.includes ?? []).filter((text) => !content.includes(text.toLowerCase()));
  if (missingText.length) return `${label}: missing ${missingText.join(', ')}`;

  const wrongFields = fieldMismatches(controlValues, check.fields ?? {});
  if (wrongFields.length) return `${label}: ${wrongFields.join('; ')}`;

  if (check.controls && !check.controls.some((partial) => fieldMismatches(controlValues, partial).length === 0)) {
    return `${label}: controls ${content.slice(0, 200)}`;
  }

  if (check.condition !== undefined) {
    const { skip } = controlValues;
    if (check.condition === false && hasCondition(skip)) return `${label}: unexpected condition ${lower(skip)}`;
    if (check.condition !== false && !hasCondition(skip)) return `${label}: no condition`;
    if (Array.isArray(check.condition)) {
      const missing = check.condition.filter((text) => !lower(skip).includes(text.toLowerCase()));
      if (missing.length) return `${label}: condition ${lower(skip)} lacks ${missing.join(', ')}`;
    }
  }

  return undefined;
}

/**
 * A top-level `payload` property is the model declaring fields as `payload.orderId`. Both tool flows turn on
 * `validatePayload` once the schema has properties, so a trigger that sends `orderId` itself is then rejected.
 */
function payloadSchemaCheck({ payloadKeys, payloadRequired }: WorkflowSummary): EvaluationResult {
  const problems = [
    ...payloadKeys
      .filter((key) => key === 'payload' || key.startsWith('payload.'))
      .map((key) => `top-level "${key}" property`),
    ...missingFrom(payloadKeys, payloadRequired).map((key) => `"${key}" is required but not declared`),
  ];

  return score('payload_schema_ok', problems.length === 0, problems.join('; ') || undefined);
}

/**
 * Checks the workflow Copilot left behind against the example's expectation. Only the
 * expectations an example defines are scored, plus `payload_schema_ok` for every workflow;
 * `task_success` is all of them passing.
 */
export function workflowChecks({ outputs, referenceOutputs }: EvaluatorArgs): EvaluationResult[] {
  const { workflow } = outputs as TargetOutputs;
  if (!workflow) return [score('workflow_created', false, 'no workflow'), score('task_success', false)];

  const expected = (referenceOutputs ?? {}) as Expectation;
  const results: EvaluationResult[] = [score('workflow_created', true)];

  if (expected.name) {
    results.push(
      score('name_match', workflow.name.trim().toLowerCase() === expected.name.toLowerCase(), `name: ${workflow.name}`)
    );
  }

  if (expected.stepTypes) {
    const actual = workflow.steps.map((step) => step.type);
    results.push(
      score(
        'step_types_match',
        actual.join(',') === expected.stepTypes.join(','),
        `expected [${expected.stepTypes}], got [${actual}]`
      )
    );
  }

  if (expected.critical !== undefined) {
    const staleness = workflow.apiKeyReadReason
      ? `; read with the API key (${workflow.apiKeyReadReason}), so it may be up to 60 s stale`
      : '';
    results.push(
      score('critical_match', workflow.critical === expected.critical, `critical: ${workflow.critical}${staleness}`)
    );
  }

  if (expected.tags) {
    const missing = missingFrom(workflow.tags, expected.tags);
    results.push(score('tags_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  if (expected.payloadKeys || expected.payloadRequired) {
    const missing = [
      ...missingFrom(workflow.payloadKeys, expected.payloadKeys ?? []),
      ...missingFrom(workflow.payloadRequired, expected.payloadRequired ?? []).map((key) => `${key} (required)`),
    ];
    results.push(score('payload_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  results.push(payloadSchemaCheck(workflow));

  if (expected.steps) {
    const failures = expected.steps.map((check) => stepCheckFailure(workflow, check)).filter(Boolean);
    results.push(score('step_details_match', failures.length === 0, failures.join('\n') || undefined));
  }

  results.push(score('task_success', results.every((result) => result.score === 1)));

  return results;
}

/** Calls within one turn that share the tool and the exact input, and how many times that call was made. */
interface RepeatedCall {
  turn: number;
  toolName: string;
  input: string;
  count: number;
}

function repeatedCalls(turns: TargetOutputs['turns']): RepeatedCall[] {
  return turns.flatMap((turn, index) => {
    const calls = new Map<string, RepeatedCall>();
    for (const { toolName, input } of turn.toolCalls) {
      const json = stableJson(input) ?? '';
      const key = `${toolName} ${json}`;
      const call = calls.get(key) ?? { turn: index + 1, toolName, input: json, count: 0 };
      call.count++;
      calls.set(key, call);
    }

    return [...calls.values()].filter(({ count }) => count > 1);
  });
}

/** From the chat stream: tool calls and failures, the per-turn budget, and internal text leaked into replies. */
export function toolUsage({ outputs }: EvaluatorArgs): EvaluationResult[] {
  const { turns = [], error } = outputs as TargetOutputs;
  const calls = turns.flatMap((turn) => turn.toolCalls);
  const failed = calls.filter((call) => call.error);
  const streamErrors = turns.filter((turn) => turn.streamError).map((turn) => turn.streamError);
  const seconds = turns.map((turn) => turn.seconds);
  const maxSeconds = Math.max(0, ...seconds);
  const repeated = repeatedCalls(turns);
  const leaked = turns.flatMap((turn, index) =>
    (turn.droppedText ?? []).map((text) => `turn ${index + 1}: ${text.slice(0, 80)}`)
  );

  return [
    { key: 'tool_calls', score: calls.length },
    {
      key: 'tool_errors',
      score: failed.length,
      comment: failed.map((call) => `${call.toolName}: ${call.error}`).join('\n') || undefined,
    },
    score('run_completed', !error && streamErrors.length === 0, error ?? (streamErrors.join('\n') || undefined)),
    {
      key: 'max_turn_seconds',
      score: maxSeconds,
      comment: turns.length ? `turn ${seconds.indexOf(maxSeconds) + 1}` : undefined,
    },
    {
      key: 'repeated_tool_calls',
      score: repeated.reduce((total, { count }) => total + count - 1, 0),
      comment:
        repeated
          .map(({ turn, toolName, count, input }) => `turn ${turn}: ${toolName} ×${count} ${input.slice(0, 120)}`)
          .join('\n') || undefined,
    },
    { key: 'leaked_internal_text', score: leaked.length, comment: leaked.join('\n') || undefined },
  ];
}

type RunWithCost = Run & { total_cost?: number | string | null };

/** A turn's root run and the project it was traced into. */
interface TurnTrace {
  run: RunWithCost;
  projectId: string;
  projectName: string;
}

const TRACE_POLL_ATTEMPTS = 10;
const TRACE_POLL_MS = 3000;

/**
 * The root run of each turn of the chat, from every trace project found; `complete` is false when not every
 * turn's run had ended in time.
 */
async function findTurnTraces(
  client: Client,
  findProjects: () => Promise<Map<string, string>>,
  chatId: string,
  turns: number
) {
  // Traces reach LangSmith asynchronously, so wait until every turn's root run has ended.
  for (let attempt = 1; ; attempt++) {
    const traces: TurnTrace[] = [];
    for (const [projectId, projectName] of await findProjects()) {
      for await (const run of client.listRuns({
        projectId,
        isRoot: true,
        filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${chatId}"))`,
      })) {
        traces.push({ run, projectId, projectName });
      }
    }

    const complete = traces.length >= turns && traces.every(({ run }) => run.end_time);
    if (complete || attempt === TRACE_POLL_ATTEMPTS) return { traces, complete };

    await sleep(TRACE_POLL_MS);
  }
}

/**
 * Pulls tokens, cost and LLM call counts from the traces the API wrote for this chat (grouped by
 * the LangGraph `thread_id`, which is the chat id), and checks the run used the expected tools
 * via the `tools:direct` / `tools:mcp` tag. The traces are looked up in every project in
 * `projectNames`, since the API traces into whatever its LANGSMITH_PROJECT was when it started.
 * A `variant_check` of 0 means the API was not started with the flag you think it was, or fell
 * back to direct tools.
 */
export function apiTraceMetrics(client: Client, projectNames: string[], variant: 'direct' | 'mcp') {
  /** Id → name of the projects found so far. The API creates a project with its first trace, so others are retried. */
  const projects = new Map<string, string>();
  const findProjects = async () => {
    for (const projectName of projectNames) {
      const known = [...projects.values()].includes(projectName);
      if (!known && (await client.hasProject({ projectName }))) {
        projects.set((await client.readProject({ projectName })).id, projectName);
      }
    }

    return projects;
  };

  return async function apiTrace({ outputs }: EvaluatorArgs): Promise<EvaluationResult[]> {
    const { chatId, turns = [] } = outputs as TargetOutputs;
    if (!chatId) return [score('variant_check', false, 'no chat id')];

    const { traces, complete } = await findTurnTraces(client, findProjects, chatId, turns.length);
    if (traces.length === 0) {
      return [score('variant_check', false, `no API traces found for chat ${chatId} in ${projectNames.join(' or ')}`)];
    }

    traces.sort((a, b) => new Date(a.run.start_time ?? 0).getTime() - new Date(b.run.start_time ?? 0).getTime());
    const llmCallsPerTurn: number[] = [];
    for (const { run, projectId } of traces) {
      let llmCalls = 0;
      for await (const _ of client.listRuns({ projectId, traceId: run.trace_id, runType: 'llm' })) llmCalls++;
      llmCallsPerTurn.push(llmCalls);
    }

    const sum = (pick: (run: RunWithCost) => unknown) =>
      traces.reduce((total, { run }) => total + Number(pick(run) ?? 0), 0);
    const partial = complete
      ? undefined
      : `partial: only ${traces.filter(({ run }) => run.end_time).length} of ${turns.length} turn traces had ended`;
    const metric = (key: string, value: number): EvaluationResult => ({ key, score: value, comment: partial });
    const maxLlmCalls = Math.max(...llmCallsPerTurn);
    const expectedTag = `tools:${variant}`;
    const wrongVariant = traces.filter(({ run }) => !run.tags?.includes(expectedTag));
    const source = `traces in ${[...new Set(traces.map(({ projectName }) => projectName))].join(', ')}`;

    return [
      score(
        'variant_check',
        wrongVariant.length === 0,
        wrongVariant.length
          ? `${wrongVariant.length} turn(s) missing ${expectedTag}: ${wrongVariant[0].run.tags}; ${source}`
          : source
      ),
      metric('llm_calls', llmCallsPerTurn.reduce((total, count) => total + count, 0)),
      {
        key: 'max_llm_calls_per_turn',
        score: maxLlmCalls,
        comment: [`turn ${llmCallsPerTurn.indexOf(maxLlmCalls) + 1}`, partial].filter(Boolean).join('; '),
      },
      metric('total_tokens', sum((run) => run.total_tokens)),
      metric('prompt_tokens', sum((run) => run.prompt_tokens)),
      metric('completion_tokens', sum((run) => run.completion_tokens)),
      metric('total_cost', sum((run) => run.total_cost)),
    ];
  };
}
