import { buildAndWriteReport } from '../../report/build-report';
import type { ResolvedAuth } from '../../types';
import type { WizardStore } from '../../ui/store';
import type { WizardUI } from '../../ui/wizard-ui';

export interface RunWriteReportStepInput {
  ui: WizardUI;
  store: WizardStore;
  auth: ResolvedAuth;
  /** Optional explicit path that the agent wrote `novu-wizard-report.md` to. */
  agentReportPath?: string;
}

export function runWriteReportStep(input: RunWriteReportStepInput): string {
  const { ui, store, auth, agentReportPath } = input;
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
    mcpInstalled: session.mcp.installed ?? null,
    agentReportPath,
  });

  ui.setReport(target);

  return target;
}
