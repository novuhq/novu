import { detectClaudeSettingsConflicts, formatClaudeSettingsConflictMessage } from '../../skills/check-claude-settings';
import {
  getSkillHostDir,
  installSkills,
  resolveWizardRuntimeSkillHosts,
  type SkillHost,
} from '../../skills/install-skills';
import type { WizardCommandOptions } from '../../types';
import type { WizardUI } from '../../ui/wizard-ui';

export interface RunInstallSkillsStepInput {
  ui: WizardUI;
  options: WizardCommandOptions;
  /**
   * Hosts resolved upstream by the runner. Passed in so the same list
   * drives both the skills install AND the MCP install fan-out, keeping
   * the two phases perfectly in sync. When omitted (legacy callers), the
   * step falls back to {@link resolveWizardRuntimeSkillHosts}.
   */
  hosts?: readonly SkillHost[];
}

export function runInstallSkillsStep(input: RunInstallSkillsStepInput): void {
  const { ui, options, hosts } = input;
  ui.pushStatus('Installing Novu skills…');
  try {
    const resolved = hosts ?? resolveWizardRuntimeSkillHosts(process.cwd());
    const result = installSkills(process.cwd(), {
      hosts: [...resolved],
      officialBranch: options.skillsBranch,
    });
    const dirs = Array.from(new Set(result.installed.map((s) => getSkillHostDir(s.host))))
      .filter(Boolean)
      .join(' + ');
    const message =
      result.installed.length > 0
        ? `${result.installed.length} skill files installed (${dirs})`
        : 'no skill targets detected (skipping)';
    ui.setSkills(result.installed, message);

    const conflicts = detectClaudeSettingsConflicts(process.cwd());
    if (conflicts.length > 0) {
      ui.pushStatus(formatClaudeSettingsConflictMessage(conflicts), 'warn');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.pushStatus(`skill install failed: ${message}`, 'error');
  }
}
