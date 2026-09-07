import type { CloudRegionEnum } from '../dev/enums';

export interface WizardCommandOptions {
  secretKey?: string;
  apiUrl?: string;
  dashboardUrl?: string;
  mcpUrl?: string;
  region: CloudRegionEnum;
  model?: string;
  /**
   * Skip the Bootstrap 5s countdown and auto-pick the first detected MCP
   * client. Combine with `--ci` for fully unattended runs.
   */
  yes?: boolean;
  /**
   * Force the non-interactive logging UI: no Bootstrap countdown, no MCP
   * picker, no Ink TUI. Used in CI / piped-stdin shells.
   */
  ci?: boolean;
  /**
   * Default scope for the Wizard agent run.
   *
   * - `full` — Inbox + workflows + triggers + subscribers (the recommended path)
   * - `inbox` — Inbox component only
   * - `workflows` — workflows + triggers only (no Inbox UI)
   */
  goal?: 'full' | 'inbox' | 'workflows';
  skillsBranch?: string;
  /**
   * When true, the wizard surfaces per-phase and per-agent-todo durations
   * in the UI and logs a final timing summary. Useful when triaging slow
   * runs or comparing the cost of different models / goals.
   */
  debug?: boolean;
}

export interface ResolvedAuth {
  secretKey: string;
  environmentId: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  /**
   * The dashboard user who authorized the CLI. Only present when the browser
   * device-auth flow was used (cli-flag / env paths have no user context).
   */
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  apiUrl: string;
  dashboardUrl: string;
  region: CloudRegionEnum;
  source: 'cli-flag' | 'env' | 'browser';
}

import type { DetectedTopology, ProjectPackageManager } from './context/detect-install-targets';

export interface ProjectContext {
  cwd: string;
  /** Absolute path to the **root** `package.json`, or `null` when the wizard runs in a directory without one. */
  rootPackageJsonPath: string | null;
  packageManager: ProjectPackageManager;
  /**
   * Aggregated TypeScript signal — `true` when the root has a
   * `tsconfig.json` OR any application target declares the
   * `typescript` dependency. Use {@link topology} for per-workspace
   * `hasTypeScript` values.
   */
  hasTypeScript: boolean;
  /**
   * Per-workspace topology produced by `detectInstallTargets`. Every
   * downstream consumer (UI rows, agent prompts, install step,
   * report) reads from this instead of root-level singular fields.
   */
  topology: DetectedTopology;
}

/**
 * Per-workspace framework identifier surfaced in prompts, the bootstrap
 * row, and the report. Covers the UI / fullstack stacks the Inbox SDK
 * picker keys off (`nextjs-*`, `react-vite`, `remix`, `react`) plus the
 * server-side stacks `classify-workspace.ts` recognises so an
 * `apps/api` workspace renders as `framework: 'hono'` instead of
 * leaking through as `'unknown'`.
 *
 * Mostly informational — only `nextjs-app` / `nextjs-pages` are
 * load-bearing inside `pickInboxSdk`; everything else routes through
 * the per-target `isReactBased` flag.
 */
export type ProjectFramework =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'react-vite'
  | 'remix'
  | 'react'
  | 'nestjs'
  | 'hono'
  | 'fastify'
  | 'koa'
  | 'express'
  | 'trpc-server'
  | 'apollo-server'
  | 'cloudflare-workers'
  | 'aws-lambda'
  | 'unknown';

/**
 * Identifier for one of the three parallel `Task` subagents the main agent
 * fans out into. The runner uses this to drive per-branch stop-hook gates
 * and to enforce coarse domain ownership in {@link ./agent/can-use-tool.ts}.
 */
export type SubagentBranch = 'inbox' | 'workflows' | 'subscribers';

/**
 * Structured JSON block each subagent emits in its final assistant message.
 * The main agent forwards these blocks back to the runner verbatim; the
 * runner parses them out of its own final message and feeds them into
 * {@link ./report/build-report.ts}.
 */
export interface BranchResult {
  branch: SubagentBranch;
  filesChanged: { path: string; kind: 'created' | 'edited' }[];
  workflowsCreated: { id: string; trigger: string; kind: 'code-first' | 'mcp' }[];
  triggersWired: { workflowId: string; serverFile: string; uiFile: string }[];
  subscriberSyncPoints: { file: string; hook: 'sign-up' | 'sign-in' | 'profile-update' }[];
  manualTriggersNeeded: { workflowId: string; reason: string }[];
  notes: string[];
}

/**
 * Aggregate of every parsed branch result the main agent emitted in its
 * final message. Forwarded by `runAgentStep` so the report writer can build
 * its sections deterministically.
 */
export interface AgentRunResult {
  totalMessages: number;
  toolCalls: number;
  errors: number;
  /**
   * Parsed `BranchResult` blocks, keyed by branch. A branch is missing from
   * this map if (a) it was skipped (e.g. Subscribers when no auth provider),
   * or (b) the runner could not parse a JSON block out of the agent's final
   * message — see `branchParseFailures` for the second case.
   */
  branches: Partial<Record<SubagentBranch, BranchResult>>;
  /** Branches whose JSON block failed to parse from the agent's aggregate. */
  branchParseFailures: SubagentBranch[];
  /**
   * Wall-clock timing for the parallel fan-out, surfaced under `--debug`
   * by `pipeline/runner.ts`. Captured by the runner as it observes the
   * main agent's outer `Task` `tool_use` (start) and matching `tool_result`
   * (end). All timestamps are `Date.now()` ms; see `pipeline/steps/run-agent.ts`.
   */
  timings: AgentRunTimings;
}

export interface AgentRunBranchTiming {
  branch: SubagentBranch;
  startedAt: number;
  endedAt: number;
}

export interface AgentRunTimings {
  /** `Date.now()` when `runAgentStep` started its iterator loop. */
  agentStartedAt: number;
  /** `Date.now()` when `runAgentStep` exited its iterator loop. */
  agentEndedAt: number;
  /** Per-branch start / end timestamps for every dispatched `Task`. */
  branches: AgentRunBranchTiming[];
}
