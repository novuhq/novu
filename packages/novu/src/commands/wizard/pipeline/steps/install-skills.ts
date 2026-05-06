import { detectClaudeSettingsConflicts, formatClaudeSettingsConflictMessage } from '../../skills/check-claude-settings';
import { getSkillHostDir, installSkills, resolveWizardRuntimeSkillHosts } from '../../skills/install-skills';
import type { WizardCommandOptions } from '../../types';
import type { WizardUI } from '../../ui/wizard-ui';

export function runInstallSkillsStep(ui: WizardUI, options: WizardCommandOptions): void {
  ui.pushStatus('Installing Novu skills…');
  try {
    const hosts = resolveWizardRuntimeSkillHosts(process.cwd());
    const result = installSkills(process.cwd(), {
      hosts,
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
