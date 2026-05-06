import chalk from 'chalk';
import type { McpInstaller } from '../mcp/installer';
import type { ResolvedAuth, WizardCommandOptions } from '../types';
import type { WizardStore } from '../ui/store';
import { formatDuration } from '../ui/utils/format-duration';
import { OutroKind, RunPhase, type WizardGoal } from '../ui/wizard-session';
import type { WizardUI } from '../ui/wizard-ui';
import { runAuthStep } from './steps/auth';
import { runBuildOutroStep } from './steps/build-outro';
import { runDetectProjectStep } from './steps/detect-project';
import { runInstallMcpStep } from './steps/install-mcp';
import { runInstallSkillsStep } from './steps/install-skills';
import { runAgentStep } from './steps/run-agent';
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
  let errorCount = 0;

  try {
    // 1. Detect project synchronously so the bootstrap pane has rows ready.
    runDetectProjectStep(ui);
    onTrack?.('Wizard Screen Bootstrap');

    // 2. Bootstrap row → running until the 5s gate fires (or immediately for
    //    `--yes` / `--ci`).
    ui.setRunPhase(RunPhase.Bootstrap);
    ui.setPhase('bootstrap', 'running');
    if (options.ci || options.yes) {
      store.getGate('bootstrap').resolve();
    }
    await ui.awaitBootstrapGate();
    const bootstrapProject = store.session.get().project;
    ui.setPhase(
      'bootstrap',
      'done',
      bootstrapProject ? `${bootstrapProject.framework} (${bootstrapProject.packageManager})` : undefined
    );

    // 3. Auth — switch to the auth pane and flip the row to running. `setAuth`
    //    inside `runAuthStep` will mark the row done.
    ui.setRunPhase(RunPhase.Auth);
    ui.setPhase('auth', 'running');
    await runAuthStep(ui, options);
    auth = store.session.get().auth.resolved;
    if (!auth) throw new Error('Auth completed without producing a ResolvedAuth payload');
    onTrack?.('Wizard Auth Completed', { source: auth.source });

    // 4. Skills install — run synchronously, then hold for 5s so the user can
    //    read the installed list (skipped in `--ci` / `--yes`).
    ui.setRunPhase(RunPhase.Skills);
    ui.setPhase('skills', 'running');
    runInstallSkillsStep(ui, options);
    if (!options.ci && !options.yes) {
      await wait(5_000);
    }

    // 5. Agent run.
    ui.setRunPhase(RunPhase.Agent);
    ui.setPhase('agent', 'running');
    onTrack?.('Wizard Screen Run');
    const project = store.session.get().project;
    if (!project) throw new Error('Project context missing — detection step did not run');
    const installedSkills = store.session.get().installedSkills ?? [];
    const agentResult = await runAgentStep({ options, auth, project, goal, ui, installedSkills });
    ui.setPhase('agent', 'done');

    // 6. MCP install.
    ui.setRunPhase(RunPhase.Mcp);
    ui.setPhase('mcp', 'running');
    onTrack?.('Wizard Screen Mcp');
    await runInstallMcpStep({
      ui,
      store,
      installer: mcpInstaller,
      auth,
      options,
      autoSelect: !!options.ci || !!options.yes,
    });

    // 7. Write report.
    ui.setRunPhase(RunPhase.Report);
    ui.setPhase('report', 'running');
    const reportPath = runWriteReportStep({ ui, store, auth, agentReportPath: agentResult.reportFilePath });
    onTrack?.('Wizard Report Written', { reportPath });

    // 8. Build outro. `setOutroData` flips `runPhase` to Outro/Error so the
    //    RunScreen swaps its right pane to <OutroPane />.
    ui.setRunPhase(RunPhase.Outro);
    ui.setPhase('done', 'running');
    runBuildOutroStep({ ui, store, reportPath });
    ui.setPhase('done', 'done');
    onTrack?.('Wizard Screen Outro', { success: true });

    if (store.session.get().mcp.installed) {
      onTrack?.('Wizard Mcp Installed', {
        clientId: store.session.get().mcp.installed?.clientId,
      });
    }
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

  // 9. Outro gate. Resolved automatically when:
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
  if (options.debug) printDebugTimingSummary(store);

  return { exitCode: errorCount > 0 ? Math.max(1, exitCode) : exitCode };
}

/**
 * Writes a compact `[debug]` timing block to stdout. Runs AFTER the Ink
 * instance unmounts (alternate-screen tear-down) so the lines survive in
 * the user's regular scrollback. Safe under `--ci` too — `process.stdout`
 * is just plain stdout in both modes.
 */
function printDebugTimingSummary(store: WizardStore): void {
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
  lines.push('');

  process.stdout.write(`${lines.join('\n')}\n`);
}

/** Grace window between a clean run finishing and the wizard auto-exiting. */
const OUTRO_AUTO_DISMISS_MS = 5_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
