import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type GraderResult = 'pass' | 'fail' | 'skip';

/** A grader can return a bare status, or a status with a human-readable reason (used for fails). */
export type GraderOutcome = {
  status: GraderResult;
  reason?: string;
};

export type GraderFn = (result: RunResult) => GraderResult | GraderOutcome | Promise<GraderResult | GraderOutcome>;

export type GraderDefinition = {
  kind: 'deterministic' | 'judge';
  run: GraderFn;
  /** Human-readable label shown in eval reports (defaults to the grader key). */
  label?: string;
};

export type ToolCallRecord = {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  timestamp: number;
};

/** A command parsed by a suite's CommandParser. Suites narrow this to a concrete shape. */
export type ParsedCommand = Record<string, unknown>;

export type TapeChunk<TParsed = ParsedCommand> = {
  stdout: string;
  when?: (parsed: TParsed) => boolean;
};

export type Tape<TParsed = ParsedCommand> = {
  chunks: Array<TapeChunk<TParsed>>;
  exitCode?: number;
  /** Optional suite-defined validation; return an error string to make the tracked command fail. */
  validate?: (parsed: TParsed) => string | null;
  /**
   * When this returns true for a parsed command, the shell stays running (no exit code)
   * after emitting its chunks and only completes when the agent kills it. Models real
   * long-running CLI branches (e.g. the no-token Slack connect that waits for a config
   * token) so a "kill before re-run" requirement is genuinely enforceable.
   */
  pendingWhen?: (parsed: TParsed) => boolean;
};

export type ScriptedAnswer = {
  match?: RegExp;
  questionContains?: string;
  optionId: string;
  label?: string;
};

export type EvalScenario<TParsed = ParsedCommand> = {
  id: string;
  category: string;
  description: string;
  userPrompt: string;
  projectRoot: string;
  scriptedAnswers: ScriptedAnswer[];
  tape?: Tape<TParsed>;
  followUpMessages?: string[];
  /** When set, a follow-up is injected if the agent selects this option id in a picker. */
  followUpOnOptionId?: string;
  /** Scenario-specific configuration consumed by suite graders. */
  metadata?: Record<string, unknown>;
};

export type RunResult = {
  scenarioId: string;
  userPrompt: string;
  toolCalls: ToolCallRecord[];
  assistantMessages: string[];
  finalText: string;
  capturedUrls: string[];
  openedFiles: string[];
  killedShellIds: string[];
  /** Shell ids of commands the suite parser marked as tracked (e.g. the connect command). */
  trackedShellIds: string[];
  polledShellIds: string[];
  /** Raw command strings the suite parser marked as tracked. */
  trackedCommands: string[];
  /** Suite-owned captures (e.g. the drafted agent description). */
  metadata: Record<string, unknown>;
};

export type MockShellState<TParsed = ParsedCommand> = {
  id: string;
  command: string;
  parsed: TParsed | null;
  isTracked: boolean;
  chunks: string[];
  emittedStdout: string[];
  chunkIndex: number;
  exitCode: number | null;
  completed: boolean;
  killed: boolean;
};

/** Parses shell commands a suite cares about (e.g. `novu connect`). */
export type CommandParser<TParsed = ParsedCommand> = {
  matches: (command: string) => boolean;
  parse: (command: string, env: Record<string, string>) => TParsed;
};

export type RegisteredScenario<TParsed = ParsedCommand> = {
  scenario: EvalScenario<TParsed>;
  graders: Record<string, GraderDefinition>;
};

/** A suite plugs suite-specific behavior into the generic harness. */
export type Suite<TParsed = ParsedCommand> = {
  id: string;
  description: string;
  /** Playbook/instructions injected as the system prompt. */
  systemPrompt: { path: string } | { text: string };
  /** Optional override for the agent preamble prepended to the playbook. */
  systemPromptPreamble?: string;
  commandParser: CommandParser<TParsed>;
  scenarios: Array<RegisteredScenario<TParsed>>;
  /** stdout patterns whose captured path (group 1) holds a URL to read and record. */
  sentinelFilePatterns?: RegExp[];
  /** Text pattern in assistant output that should trigger a scripted follow-up message. */
  followUpTextPattern?: RegExp;
  /** Hook to capture suite-specific metadata when a tracked command runs. */
  onTrackedCommand?: (
    command: string,
    parsed: TParsed,
    recorder: { setMetadata: (k: string, v: unknown) => void }
  ) => void;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(currentDir, '../..');

export function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\.\/+/, '');
}
