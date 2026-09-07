import React from 'react';
import type { WizardServices } from '../services';

/**
 * Resolves the `bootstrap` gate as soon as the screen has mounted. The
 * historical 5s "look at the detected topology" countdown was removed in
 * favour of starting the parallel auth/install/skills/mcp block as fast
 * as possible — users can read the bootstrap row in the pipeline pane
 * (and the live tail) any time during the rest of the run.
 *
 * Renders nothing. `--ci` / `--yes` resolve the gate eagerly via the
 * runner; this hook covers the interactive Ink path.
 */
export function useBootstrapCountdown(services: WizardServices): void {
  const gateFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (gateFiredRef.current) return;
    services.store.getGate('bootstrap').resolve();
    gateFiredRef.current = true;
  }, [services]);
}
