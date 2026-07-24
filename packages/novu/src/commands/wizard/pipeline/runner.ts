import chalk from 'chalk';
import { shortenToolName } from '../agent/tool-labels';
import { summariseTopology } from '../context/summarise-topology';
import type { McpInstaller } from '../mcp/installer';
import { resolveWizardRuntimeSkillHosts } from '../skills/install-skills';
import type { AgentRunResult, ResolvedAuth, WizardCommandOptions } from '../types';
import { TrailKind, type WizardStore } from '../ui/store';
import { formatDuration } from '../ui/utils/format-duration';
import { OutroKind, RunPhase, type WizardGoal } from '../ui/wizard-session';
import type { WizardUI } from '../ui/wizard-ui';
import { runAuthStep } from './steps/auth';
import { runBuildOutroStep } from './steps/build-outro';
import { runDetectProjectStep } from './steps/detect-project';
import { runInstallMcpStep } from './steps/install-mcp';
import { type InstallPackagesResult, runInstallPackagesStep } from './steps/install-packages';
import { runInstallSkillsStep } from './steps/install-skills';
import { type RunAgentStepResult, runAgentStep, WIZARD_FIX_LOOP_BUDGET_MS } from './steps/run-agent';
import { buildFixValidationPrompt, runValidateStep, summariseValidation } from './steps/validate';
import { runWriteReportStep } from './steps/write-report';

export interface RunWizardPipelineInput {
  options: WizardCommandOptions;
  goal: WizardGoal;
  ui: WizardUI;
  store: WizardStore;
  mcpInstaller: McpInstaller;
  /** Optional analytics callback. */
  onTrack?: (event: string, data?: Record<string, unknown>) => void;
}

export interface RunWizardPipelineResult {
  exitCode: number;
}

/**
 * Top-level orchestrator. Calls each step sequentially
 * against the {@link WizardUI} bridge, never touching the store
 * directly.
 */
export async function runWizardPipeline(input: RunWizardPipelineInput): Promise<RunWizardPipelineResult> {
  const { options, goal, ui, store, mcpInstaller, onTrack } = input;
  let auth: ResolvedAuth | undefined;
  let agentResult: RunAgentStepResult | undefined;
  let installResult: InstallPackagesResult | undefined;
  let errorCount = 0;

  try {
    // 1. Detect project synchronously so the bootstrap pane has rows ready.
    runDetectProjectStep(ui);
    onTrack?.('Wizard Screen Bootstrap');

    // 2. Bootstrap row. The countdown gate now fires immediately (the 5s
    //    "look at this" delay was dropped in favour of a faster startup);
    //    `--ci` / `--yes` still resolve the gate explicitly for clarity.
    ui.setRunPhase(RunPhase.Bootstrap);
    ui.setPhase('bootstrap', 'running');
    if (options.ci || options.yes) {
      store.getGate('bootstrap').resolve();
    }
    await ui.awaitBootstrapGate();
    const bootstrapProject = store.session.get().project;
    ui.setPhase('bootstrap', 'done', bootstrapProject ? summariseTopology(bootstrapProject.topology) : undefined);

    // 3. Pre-agent fan-out (parallel). Auth, skills, package install, and MCP
    //    install all run concurrently. The right pane stays on `AuthPane` for
    //    the whole block — that's where the user-blocking interaction lives;
    //    the pipeline pane on the left shows each row ticking off in
    //    background. MCP chains on auth (it needs the resolved API key),
    //    everything else fires immediately.
    //
    //    HARD GATE: the agent only starts once every promise here resolves.
    //    `Promise.all` rejects on the first failure, so any rejection (auth
    //    abort, install rebalance-block) drops us into the runner's catch
    //    below — agent / validate / report are skipped and `OutroKind.Error`
    //    is shown. MCP install is wrapped in fail-soft try/catch internally
    //    (see `pipeline/steps/install-mcp.ts`) so it never rejects on its own.
    ui.setRunPhase(RunPhase.Auth);
    ui.setPhase('skills', 'running');
    ui.setPhase('install', 'running');
    ui.setPhase('auth', 'running');

    // Resolve agent / editor hosts ONCE up front so the skills installer
    // and the MCP installer fan out across the same set of editors. Without
    // this the two steps would re-detect independently and could disagree
    // (e.g. if the agent later writes a new editor's config dir mid-run).
    const hosts = resolveWizardRuntimeSkillHosts(process.cwd());

    const skillsPromise = (async () => {
      // `runInstallSkillsStep` is synchronous + fail-soft internally; wrapping
      // it in a Promise lets us await it alongside the others without changing
      // its signature. `setSkills` flips the phase row to `done`; on the
      // failure branch the step pushes a status but does not throw.
      runInstallSkillsStep({ ui, options, hosts });
    })();

    const installPromise = (async () => {
      const project = store.session.get().project;
      if (!project) throw new Error('Project context missing — detection step did not run');
      const result = await runInstallPackagesStep({ ui, project, goal });
      ui.setPhase('install', 'done', summariseInstall(result));

      return result;
    })();

    const authPromise = (async () => {
      await runAuthStep(ui, options);
      const resolved = store.session.get().auth.resolved;
      if (!resolved) throw new Error('Auth completed without producing a ResolvedAuth payload');

      return resolved;
    })();

    const mcpPromise = (async () => {
      // Chains on auth — the installer needs the resolved API key + region.
      // If auth rejects, this body throws too and Promise.all observes both.
      const resolvedAuth = await authPromise;
      ui.setPhase('mcp', 'running');
      onTrack?.('Wizard Screen Mcp');
      await runInstallMcpStep({
        ui,
        store,
        installer: mcpInstaller,
        auth: resolvedAuth,
        options,
        hosts,
        autoSelect: true,
      });
    })();

    const [, installResultOut, resolvedAuth] = await Promise.all([
      skillsPromise,
      installPromise,
      authPromise,
      mcpPromise,
    ]);
    installResult = installResultOut;
    auth = resolvedAuth;
    onTrack?.('Wizard Auth Completed', { source: auth.source });

    const mcpInstalled = store.session.get().mcp.installed;
    if (mcpInstalled.length > 0) {
      for (const entry of mcpInstalled) {
        onTrack?.('Wizard Mcp Installed', { clientId: entry.clientId });
      }
    }

    // The install step may have downgraded the goal (web-only → inbox,
    // api-only → workflows). Use the effective goal from here on so the
    // agent's prompt + branch dispatching match the topology.
    const effectiveGoal = installResult.effectiveGoal;

    // 4. Agent run with an in-session validate ↔ fix loop.
    //    Every time the agent ends a turn (`isMainTurnResult`) the fix loop
    //    runs ONE lint + ONE typecheck per touched workspace. If anything
    //    fails AND the cumulative validate budget has not been exhausted,
    //    the failures are pushed back into the SAME SDK session as a
    //    follow-up user message; the agent edits the offending files and
    //    ends its turn again. This continues until the code is clean OR
    //    `WIZARD_FIX_LOOP_BUDGET_MS` is consumed by validate-side wall-clock.
    //
    //    The agent's own lint/tsc retries are still blocked via
    //    `agent/can-use-tool.ts` — the CLI is the only validator. Whatever
    //    survives the loop lands in the report; it does NOT bump
    //    `errorCount` (user-fixable, not wizard bugs).
    ui.setRunPhase(RunPhase.Agent);
    ui.setPhase('agent', 'running');
    onTrack?.('Wizard Screen Run');
    const project = store.session.get().project;
    if (!project) throw new Error('Project context missing — detection step did not run');
    const installedSkills = store.session.get().installedSkills ?? [];
    const validateInstallResult = installResult;
    agentResult = await runAgentStep({
      options,
      auth,
      project,
      goal: effectiveGoal,
      ui,
      installedSkills,
      installResult,
      fixLoop: {
        runValidate: () => runValidateStep({ ui, installResult: validateInstallResult }),
        buildFixPrompt: buildFixValidationPrompt,
        budgetMs: WIZARD_FIX_LOOP_BUDGET_MS,
        onValidateStart: () => {
          ui.setRunPhase(RunPhase.Validate);
          ui.setPhase('validate', 'running');
        },
        onValidateAttempt: (attempt, failures) => {
          const hint = failures
            ? `Attempt ${attempt} — fixing ${failures.length} issue${failures.length === 1 ? '' : 's'}…`
            : `Attempt ${attempt}…`;
          ui.setPhase('validate', 'running', hint);
        },
        onValidateDone: (final, reason) => {
          // `final` is the full results array (both passes and failures)
          // so the report can render the "Passed" section. The phase hint
          // only counts non-zero exits, otherwise a clean run would
          // misreport every run row as a remaining issue.
          const remaining = final.filter((r) => r.exitCode !== 0).length;
          const summary =
            reason === 'budget'
              ? `${remaining} issue${remaining === 1 ? '' : 's'} remain — budget exhausted`
              : summariseValidation(final);
          ui.setPhase('validate', 'done', summary);
        },
      },
    });
    ui.setPhase('agent', 'done');

    // 5. Write report.
    ui.setRunPhase(RunPhase.Report);
    ui.setPhase('report', 'running');
    const reportPath = runWriteReportStep({
      ui,
      store,
      auth,
      agentResult,
      installResult,
      validation: agentResult.validation,
      validationAttempts: agentResult.validationAttempts,
      validationReason: agentResult.validationReason,
    });
    onTrack?.('Wizard Report Written', { reportPath });

    // 7. Build outro. `setOutroData` flips `runPhase` to Outro/Error so the
    //    RunScreen swaps its right pane to <OutroPane />.
    ui.setRunPhase(RunPhase.Outro);
    ui.setPhase('done', 'running');
    runBuildOutroStep({ ui, store, reportPath });
    ui.setPhase('done', 'done');
    onTrack?.('Wizard Screen Outro', { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.pushStatus(message, 'error');
    ui.setOutroData({
      kind: OutroKind.Error,
      message: `Wizard failed: ${message}`,
      reportFile: store.session.get().report?.path,
    });
    errorCount += 1;
  }

  // 8. Outro gate. Resolved automatically when:
  //    - we're in `--ci` / `--yes` (no prompts wanted) — instantly, or
  //    - the run finished cleanly (errorCount === 0) — after a short grace
  //      window so the user actually sees the success outro before the
  //      wizard tears the UI down.
  //    When errors WERE recorded we keep the gate open. The user can still
  //    type `/errors` to inspect them and presses Enter (routed through
  //    `useSlashInput`'s `onSubmitEmpty`) to dismiss the outro and exit.
  if (options.ci || options.yes) {
    store.getGate('outro').resolve();
  } else if (errorCount === 0) {
    setTimeout(() => store.getGate('outro').resolve(), OUTRO_AUTO_DISMISS_MS);
  }
  await ui.awaitOutroGate();

  ui.setRunPhase(errorCount > 0 ? RunPhase.Error : RunPhase.Done);
  if (errorCount > 0) process.exitCode = Math.max(1, Number(process.exitCode ?? 1));

  const exitCode = await ui.shutdown();

  /**
   * Printed AFTER `ui.shutdown()` so the lines land in the user's regular
   * scrollback — not in the alt-screen buffer that Ink throws away on
   * unmount.
   */
  if (options.debug) {
    printDebugActivityTrace(store);
    printDebugTimingSummary(store, agentResult);
  }

  return { exitCode: errorCount > 0 ? Math.max(1, exitCode) : exitCode };
}

/**
 * Dumps the full `/activity` trail to stdout in a compact format. Runs AFTER
 * Ink unmounts so the lines land in the user's regular scrollback. Useful for
 * post-mortem triage — paste the block into a chat and the full sequence of
 * assistant messages, tool calls, diffs, and errors is visible.
 */
function printDebugActivityTrace(store: WizardStore): void {
  const trail = store.trail.get();
  if (trail.length === 0) return;

  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.cyan('[debug] activity trace'));

  for (const entry of trail) {
    const ts = new Date(entry.at).toISOString().slice(11, 19);

    if (entry.kind === TrailKind.Status) {
      const tone = entry.tone === 'error' ? chalk.red : entry.tone === 'warn' ? chalk.yellow : chalk.gray;
      lines.push(tone(`  ${ts}  [status] ${entry.message}`));
    } else if (entry.kind === TrailKind.Assistant) {
      const preview = entry.markdown.replace(/\n/g, ' ').slice(0, 120);
      lines.push(chalk.gray(`  ${ts}  [assistant] ${preview}${entry.markdown.length > 120 ? '…' : ''}`));
    } else if (entry.kind === TrailKind.ToolUse) {
      const branchTag = entry.branch ? `[${entry.branch}] ` : '';
      lines.push(
        chalk.gray(`  ${ts}  ${branchTag}${shortenToolName(entry.toolName)}${entry.label ? ` · ${entry.label}` : ''}`)
      );
    } else if (entry.kind === TrailKind.Diff) {
      lines.push(chalk.gray(`  ${ts}  [diff] ${entry.file} (+${entry.added}/-${entry.removed})`));
    } else if (entry.kind === TrailKind.Error) {
      lines.push(chalk.red(`  ${ts}  [error:${entry.source}] ${entry.message}`));
    }
  }

  lines.push('');
  process.stdout.write(`${lines.join('\n')}\n`);
}

/**
 * Writes a compact `[debug]` timing block to stdout. Runs AFTER the Ink
 * instance unmounts (alternate-screen tear-down) so the lines survive in
 * the user's regular scrollback. Safe under `--ci` too — `process.stdout`
 * is just plain stdout in both modes.
 *
 * The "subagent fan-out" section is the diagnostic that matters for
 * performance triage: per-branch wall-clock, the parallel block as a
 * whole, sum-of-branches, and the speedup ratio (`sum / wall_clock`).
 * 1.0 means subagents ran sequentially; N means perfectly parallel for
 * N branches. `pre-fan-out idle` and `post-fan-out idle` measure the
 * main agent's reasoning time before dispatch and after the last
 * subagent returns — historically the biggest wins live there.
 */
function printDebugTimingSummary(store: WizardStore, agentResult: AgentRunResult | undefined): void {
  const phases = store.phases.get();
  const todos = store.todos.get();
  const session = store.session.get();
  const totalMs = Date.now() - session.startedAt;

  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.cyan('[debug] timing summary'));
  lines.push(chalk.gray(`  total: ${formatDuration(totalMs)}`));

  const phaseRows = phases.filter((p) => p.durationMs !== undefined || p.status === 'running');
  if (phaseRows.length > 0) {
    lines.push(chalk.gray('  phases:'));
    for (const phase of phaseRows) {
      const duration = phase.durationMs ?? (phase.startedAt ? Date.now() - phase.startedAt : undefined);
      const renderedDuration = duration !== undefined ? formatDuration(duration) : '–';
      lines.push(chalk.gray(`    ${phase.id.padEnd(10, ' ')}  ${phase.status.padEnd(9, ' ')}  ${renderedDuration}`));
    }
  }

  const todoRows = todos.filter((t) => t.durationMs !== undefined);
  if (todoRows.length > 0) {
    lines.push(chalk.gray('  agent todos:'));
    for (const todo of todoRows) {
      lines.push(chalk.gray(`    ${formatDuration(todo.durationMs ?? 0).padEnd(8, ' ')}  ${todo.content}`));
    }
  }

  if (agentResult && agentResult.timings.branches.length > 0) {
    const { agentStartedAt, agentEndedAt, branches } = agentResult.timings;
    const firstStart = Math.min(...branches.map((b) => b.startedAt));
    const lastEnd = Math.max(...branches.map((b) => b.endedAt));
    const wallClock = lastEnd - firstStart;
    const sumOfBranches = branches.reduce((acc, b) => acc + (b.endedAt - b.startedAt), 0);
    const speedup = wallClock > 0 ? sumOfBranches / wallClock : branches.length;
    const preFanOutIdle = firstStart - agentStartedAt;
    const postFanOutIdle = agentEndedAt - lastEnd;

    lines.push(chalk.gray('  subagent fan-out:'));
    for (const b of branches) {
      lines.push(chalk.gray(`    ${b.branch.padEnd(12, ' ')}  ${formatDuration(b.endedAt - b.startedAt)}`));
    }
    lines.push(
      chalk.gray(`    parallel block:    ${formatDuration(wallClock)}  (sum ${formatDuration(sumOfBranches)})`)
    );
    lines.push(
      chalk.gray(`    speedup:           ${speedup.toFixed(2)}x  (1.0 = sequential, ${branches.length}.0 = ideal)`)
    );
    lines.push(chalk.gray(`    pre-fan-out idle:  ${formatDuration(preFanOutIdle)}`));
    lines.push(chalk.gray(`    post-fan-out idle: ${formatDuration(postFanOutIdle)}`));
  }
  lines.push('');

  process.stdout.write(`${lines.join('\n')}\n`);
}

/**
 * Builds the one-line `hint` rendered next to the "Packages installed"
 * row in the pipeline pane. Examples:
 *
 *   "@novu/nextjs in apps/web (pnpm)"
 *   "Installed in 2 workspaces; 1 declared in package.json"
 *   "Skipped — packages already installed"
 */
function summariseInstall(result: InstallPackagesResult): string {
  const installed = result.targets.filter((t) => t.packagesInstalled.length > 0);
  const edited = result.targets.filter((t) => t.packagesEditedDirectly.length > 0);
  const skippedInside = result.targets.filter(
    (t) => t.packagesRequested.length === 0 && t.packagesInstalled.length === 0 && t.packagesEditedDirectly.length === 0
  );

  if (installed.length === 0 && edited.length === 0) {
    if (skippedInside.length > 0) return 'Skipped — packages already installed';

    return 'No application workspaces detected';
  }

  const parts: string[] = [];
  if (installed.length === 1 && edited.length === 0) {
    const target = installed[0];
    const label = target.workspaceName ?? 'cwd';
    parts.push(`${target.packagesInstalled.join(', ')} in ${label} (${result.packageManager.family})`);
  } else {
    if (installed.length > 0)
      parts.push(`Installed in ${installed.length} workspace${installed.length > 1 ? 's' : ''}`);
    if (edited.length > 0) parts.push(`${edited.length} declared in package.json`);
  }
  if (result.skippedWorkspaces.length > 0) parts.push(`${result.skippedWorkspaces.length} library skipped`);

  return parts.join('; ');
}

/** Grace window between a clean run finishing and the wizard auto-exiting. */
const OUTRO_AUTO_DISMISS_MS = 5_000;
