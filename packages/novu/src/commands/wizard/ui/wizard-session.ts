import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, WizardCommandOptions } from '../types';

export enum RunPhase {
  Idle = 'idle',
  Bootstrap = 'bootstrap',
  Auth = 'auth',
  Skills = 'skills',
  Install = 'install',
  Agent = 'agent',
  Validate = 'validate',
  Mcp = 'mcp',
  Report = 'report',
  Outro = 'outro',
  Done = 'done',
  Error = 'error',
}

export enum AuthStatus {
  Idle = 'idle',
  Countdown = 'countdown',
  Authorizing = 'authorizing',
  Ready = 'ready',
  Failed = 'failed',
}

export enum OutroKind {
  Success = 'success',
  Error = 'error',
  Cancel = 'cancel',
}

export type WizardGoal = 'full' | 'inbox' | 'workflows';

export type AuthState = {
  status: AuthStatus;
  message?: string;
  /**
   * Dashboard login URL displayed beneath the spinner so the user can copy
   * (or cmd+click) it if their browser failed to open. Kept separate from
   * `message` so spinner re-renders never touch the URL line — that's what
   * preserves mouse selection across spinner ticks.
   */
  dashboardLoginUrl?: string;
  error?: string;
  resolved?: ResolvedAuth;
};

export type McpClientCandidate = {
  /** Stable id (lowercase, dash-cased — e.g. "cursor", "claude-code"). */
  id: string;
  /** Display label shown in the picker. */
  label: string;
  /** Filesystem location used to detect the client (relative path or `~/...`). */
  marker?: string;
  detected: boolean;
};

export type McpInstallResult = {
  clientId: string;
  clientLabel: string;
  configPath: string;
};

export type OutroData = {
  kind: OutroKind;
  /** Short success / failure heading. */
  message: string;
  /** Up-to-6 bullet points to render under the heading. */
  changes?: string[];
  reportFile?: string;
  dashboardUrl?: string;
  docsUrl?: string;
};

export type WizardSession = {
  options: WizardCommandOptions;
  goal: WizardGoal;
  project?: ProjectContext;
  auth: AuthState;
  installedSkills: InstalledSkill[];
  skillsMessage?: string;
  runPhase: RunPhase;
  outroData?: OutroData;
  mcp: {
    candidates: McpClientCandidate[];
    selectedClientId: string | null;
    /**
     * Every successful MCP install. The wizard auto-selects every detected
     * host (one MCP server per editor) so this list usually has 1–N entries;
     * the legacy interactive picker installs into a single client and
     * appends one entry. Empty when MCP install was skipped or failed.
     */
    installed: McpInstallResult[];
    skipped?: boolean;
  };
  report?: { path: string };
  /**
   * Wall-clock timestamp recorded the moment the wizard store is created.
   * Drives the always-on elapsed timer in the header and feeds the debug
   * timing summary printed at exit.
   */
  startedAt: number;
};
