import { buildAndWriteReport } from '../../report/build-report';
import type { AgentRunResult, ResolvedAuth } from '../../types';
import type { WizardStore } from '../../ui/store';
import type { WizardUI } from '../../ui/wizard-ui';
import type { InstallPackagesResult } from './install-packages';
import type { ValidationLoopReason } from './run-agent';
import type { ValidationResult } from './validate';

export interface RunWriteReportStepInput {
  ui: WizardUI;
  store: WizardStore;
  auth: ResolvedAuth;
  /**
   * Aggregate of every parallel subagent's structured JSON result, parsed
   * by `runAgentStep`. The report builder cross-checks this against the
   * tool-call trail; missing branches fall back to trail-only sections so
   * the report still ships even when the agent's aggregate is malformed.
   */
  agentResult?: AgentRunResult | null;
  /**
   * Outcome of the pre-install step (workspace classification, per-target
   * install/edit results). Drives the "Packages installed" section + the
   * "run `<pkg-mgr> install` afterwards" reminders in "Next steps".
   */
  installResult?: InstallPackagesResult;
  /**
   * Per-workspace validation outcomes from the agent's fix loop. Drives
   * the "Validation" section in the report. Empty array when no workspace
   * had a `lint` / `typecheck` script to run.
   */
  validation?: ValidationResult[];
  /**
   * Number of validate attempts the fix loop made. `>1` means the agent
   * ran one or more fix turns; the report calls this out so the user
   * knows the wizard auto-fixed something.
   */
  validationAttempts?: number;
  /**
   * Why the fix loop terminated. `'budget'` triggers the "remaining
   * issues need manual follow-up" header in the report.
   */
  validationReason?: ValidationLoopReason;
}

export function runWriteReportStep(input: RunWriteReportStepInput): string {
  const { ui, store, auth, agentResult, installResult, validation, validationAttempts, validationReason } = input;
  const session = store.session.get();
  const trail = store.trail.get();

  if (!session.project) {
    ui.pushStatus('Skipping report — project context missing.', 'warn');

    return '';
  }

  const target = buildAndWriteReport({
    cwd: session.project.cwd,
    goal: session.goal,
    project: session.project,
    auth,
    trail,
    installedSkillsCount: session.installedSkills.length,
    mcpInstalled: session.mcp.installed,
    agentResult: agentResult ?? null,
    installResult: installResult ?? null,
    validation: validation ?? null,
    validationAttempts: validationAttempts ?? 0,
    validationReason: validationReason ?? 'no-fix-loop',
  });

  ui.setReport(target);

  return target;
}
