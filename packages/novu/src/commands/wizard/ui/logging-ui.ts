import chalk from 'chalk';
import { summariseTopology } from '../context/summarise-topology';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth } from '../types';
import { printOutroToStdout } from './print-outro';
import type { PhaseStatus, PipelinePhaseId, TodoEntry, TrailEntry } from './store';
import { formatDuration } from './utils/format-duration';
import {
  AuthStatus,
  type McpClientCandidate,
  type McpInstallResult,
  type OutroData,
  RunPhase,
  type WizardGoal,
} from './wizard-session';
import type { WizardUI } from './wizard-ui';

/**
 * Plain-text `WizardUI` implementation. Used in `--ci` and non-TTY mode (e.g.
 * piped stdout, GitHub Actions) where Ink would render garbage. The driver
 * code in `pipeline/runner.ts` is unchanged — it just gets a different bridge.
 */
export function createLoggingUI(opts: {
  goal: WizardGoal;
  onShutdown: () => Promise<number>;
  /**
   * When true, every phase/todo transition is annotated with the elapsed
   * wall-clock time so users can spot regressions in non-interactive runs.
   */
  debug?: boolean;
}): WizardUI {
  const log = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };
  const dim = (line: string): void => log(chalk.gray(line));

  log(chalk.cyan('\nNovu Wizard ') + chalk.gray(`(goal: ${opts.goal})`));
  log(chalk.gray('Running in non-interactive mode — full progress is streamed below.\n'));

  let lastTodoSignature = '';
  const phaseStartedAt = new Map<PipelinePhaseId, number>();
  const todoStartedAt = new Map<string, number>();

  return {
    setProject: (project: ProjectContext) => {
      log(`${chalk.green('✓')} Project detected — ${summariseTopology(project.topology)}`);
    },
    setGoal: (goal: WizardGoal) => {
      dim(`goal: ${goal}`);
    },
    setAuthStatus: (status: AuthStatus, message?: string) => {
      if (message) dim(`auth: ${status} — ${message}`);
    },
    setAuthDashboardUrl: (url: string | null) => {
      if (url) dim(`auth: open this URL if your browser didn't — ${url}`);
    },
    setAuth: (auth: ResolvedAuth) => {
      const env = auth.environmentName ?? auth.environmentId ?? '(default)';
      log(`${chalk.green('✓')} Authenticated — env ${env} (${auth.region})`);
    },
    setAuthFailed: (error: string) => {
      log(`${chalk.red('✗')} Auth failed — ${error}`);
    },
    setRunPhase: (phase: RunPhase) => {
      dim(`phase: ${phase}`);
    },
    setPhase: (id: PipelinePhaseId, status: PhaseStatus, hint?: string) => {
      if (!opts.debug) return;
      const now = Date.now();
      if (status === 'running' && !phaseStartedAt.has(id)) {
        phaseStartedAt.set(id, now);
        dim(`[debug] phase ${id}: running${hint ? ` — ${hint}` : ''}`);

        return;
      }
      if (status === 'done' || status === 'error' || status === 'cancelled') {
        const startedAt = phaseStartedAt.get(id);
        const duration = startedAt ? formatDuration(now - startedAt) : '0ms';
        dim(`[debug] phase ${id}: ${status} (${duration})${hint ? ` — ${hint}` : ''}`);
      }
    },
    setSkills: (installed: InstalledSkill[], message?: string) => {
      log(`${chalk.green('✓')} Skills installed — ${installed.length} files${message ? ` (${message})` : ''}`);
    },
    setMcpCandidates: (candidates: McpClientCandidate[]) => {
      const detected = candidates.filter((c) => c.detected);
      dim(`mcp: detected ${detected.length} client(s) — ${detected.map((c) => c.id).join(', ') || 'none'}`);
    },
    addMcpInstall: (result: McpInstallResult) => {
      log(`${chalk.green('✓')} MCP installed into ${result.clientLabel} (${result.configPath})`);
    },
    finishMcpInstalls: (skipped = false) => {
      if (skipped) dim('mcp: skipped');
    },
    setReport: (path: string) => {
      log(`${chalk.green('✓')} Report written — ${path}`);
    },
    setOutroData: (data: OutroData) => {
      printOutroToStdout(data);
    },

    pushStatus: (message: string, tone) => {
      const prefix =
        tone === 'error'
          ? chalk.red('✗')
          : tone === 'warn'
            ? chalk.yellow('!')
            : tone === 'ok'
              ? chalk.green('✓')
              : chalk.gray('·');
      log(`${prefix} ${message}`);
    },
    pushTrail: (entry: TrailEntry) => {
      if (entry.kind === 'tool-use') {
        const branchTag = entry.branch ? `[${entry.branch}] ` : '';
        dim(`▸ ${branchTag}${entry.toolName} ${entry.label}`);
      } else if (entry.kind === 'diff') {
        dim(`✎ ${entry.file} (+${entry.added}/-${entry.removed})`);
      } else if (entry.kind === 'error') {
        log(`${chalk.red('✗')} [${entry.source}] ${entry.message}`);
      }
    },
    pushLiveTail: () => {
      // intentional no-op — live-tail is for the TUI
    },
    syncTodos: (entries: TodoEntry[]) => {
      const signature = entries.map((t) => `${t.status}:${t.content}`).join('|');
      if (signature === lastTodoSignature) return;
      lastTodoSignature = signature;
      const inProgress = entries.find((t) => t.status === 'in_progress');
      if (inProgress) {
        dim(`▸ ${inProgress.activeForm ?? inProgress.content}`);
      }

      if (!opts.debug) return;
      const now = Date.now();
      for (const entry of entries) {
        if (entry.status === 'in_progress' && !todoStartedAt.has(entry.id)) {
          todoStartedAt.set(entry.id, now);
        }
        if (entry.status === 'completed' || entry.status === 'cancelled') {
          const startedAt = todoStartedAt.get(entry.id);
          if (startedAt !== undefined) {
            todoStartedAt.delete(entry.id);
            dim(`[debug] todo ${entry.status}: ${entry.content} (${formatDuration(now - startedAt)})`);
          }
        }
      }
    },

    awaitBootstrapGate: async () => {
      // No countdown in CI; resolve immediately.
    },
    awaitMcpGate: async () => {
      // CI auto-skips MCP install — driver checks `--ci`/`--yes` and short-circuits.
    },
    awaitOutroGate: async () => {
      // No interactive outro in CI — the outro data was already logged by `setOutroData`.
    },

    shutdown: opts.onShutdown,
  };
}
