import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth } from '../types';
import type { PhaseStatus, PipelinePhaseId, TodoEntry, TrailEntry } from './store';
import type {
  AuthStatus,
  McpClientCandidate,
  McpInstallResult,
  OutroData,
  RunPhase,
  WizardGoal,
} from './wizard-session';

/**
 * Bridge interface used by the imperative driver (`pipeline/runner.ts`) to
 * push state into the UI layer. Two implementations exist:
 *
 * - {@link InkUI} translates calls into store mutations so React re-renders.
 * - {@link LoggingUI} writes plain log lines to stdout for non-TTY / `--ci`.
 *
 * The driver only ever calls methods on this interface; it never imports the
 * store directly. That keeps the same pipeline code driving both modes.
 */
export type WizardUI = {
  /* ── Session-mutating ────────────────────────────────────────────── */
  setProject: (project: ProjectContext) => void;
  setGoal: (goal: WizardGoal) => void;
  setAuthStatus: (status: AuthStatus, message?: string) => void;
  /**
   * Stream the dashboard login URL into a dedicated atom — kept separate from
   * `setAuthStatus` so the URL renders on its own static line beneath the
   * spinner. Pass `null` to clear (e.g. when auth resolves or fails).
   */
  setAuthDashboardUrl: (url: string | null) => void;
  setAuth: (auth: ResolvedAuth) => void;
  setAuthFailed: (error: string) => void;
  setRunPhase: (phase: RunPhase) => void;
  setPhase: (id: PipelinePhaseId, status: PhaseStatus, hint?: string) => void;
  setSkills: (installed: InstalledSkill[], message?: string) => void;
  setMcpCandidates: (candidates: McpClientCandidate[]) => void;
  /**
   * Append a single successful MCP install. The runner calls this once per
   * adapter when it fans out across every detected host, then closes the
   * phase out via {@link WizardUI.finishMcpInstalls}.
   */
  addMcpInstall: (result: McpInstallResult) => void;
  /** Close out the MCP phase row after the runner finishes its fan-out. */
  finishMcpInstalls: (skipped?: boolean) => void;
  setReport: (path: string) => void;
  setOutroData: (data: OutroData) => void;

  /* ── Observation ─────────────────────────────────────────────────── */
  pushStatus: (message: string, tone?: 'info' | 'ok' | 'error' | 'warn') => void;
  pushTrail: (entry: TrailEntry) => void;
  pushLiveTail: (text: string, tone?: 'info' | 'ok' | 'error' | 'warn') => void;
  syncTodos: (entries: TodoEntry[]) => void;

  /* ── Lifecycle ───────────────────────────────────────────────────── */
  /** Resolves once the bootstrap countdown elapses (or fires immediately when `--yes`/CI). */
  awaitBootstrapGate: () => Promise<void>;
  /** Resolves once the user picks an MCP client (or skip). */
  awaitMcpGate: () => Promise<void>;
  /**
   * Resolves once the user dismisses the outro pane (any keypress) or
   * immediately for `--yes` / `--ci`. The driver awaits this before calling
   * {@link shutdown} so the outro is actually visible to the user instead of
   * flashing for a single frame.
   */
  awaitOutroGate: () => Promise<void>;

  /** Final tear-down hook. Returns the resolved exit code. */
  shutdown: () => Promise<number>;
};
