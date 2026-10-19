import { detectProject as detectProjectImpl } from '../../context/detect-project';
import type { WizardUI } from '../../ui/wizard-ui';

export function runDetectProjectStep(ui: WizardUI): void {
  const project = detectProjectImpl(process.cwd());
  ui.setProject(project);
}
