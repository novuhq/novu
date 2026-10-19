import { resolveAuth } from '../../auth/resolve-auth';
import type { WizardCommandOptions } from '../../types';
import { AuthStatus } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';

export async function runAuthStep(ui: WizardUI, options: WizardCommandOptions): Promise<void> {
  ui.setAuthStatus(AuthStatus.Authorizing, 'Authorising via the Novu Dashboard…');
  try {
    const auth = await resolveAuth(options, {
      onStatus: (message) => ui.setAuthStatus(AuthStatus.Authorizing, message),
      onDashboardUrl: (url) => ui.setAuthDashboardUrl(url),
    });
    ui.setAuth(auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.setAuthFailed(message);
    throw error;
  }
}
