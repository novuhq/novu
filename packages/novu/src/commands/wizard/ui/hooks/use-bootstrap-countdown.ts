import React from 'react';
import type { WizardServices } from '../services';

const COUNTDOWN_MS = 5_000;

/**
 * Background countdown that resolves the `bootstrap` gate after a fixed
 * delay. Renders nothing — the runner reacts to the gate by flipping
 * `RunPhase` to `Auth`, which in turn swaps the right pane.
 *
 * For `--ci` and `--yes` runs the gate is resolved immediately so the
 * pipeline can proceed without waiting on a UI tick.
 */
export function useBootstrapCountdown(services: WizardServices): void {
  const gateFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (gateFiredRef.current) return;

    const session = services.store.session.get();
    if (session.options.ci || session.options.yes) {
      services.store.getGate('bootstrap').resolve();
      gateFiredRef.current = true;

      return;
    }

    const timer = setTimeout(() => {
      if (gateFiredRef.current) return;
      services.store.getGate('bootstrap').resolve();
      gateFiredRef.current = true;
    }, COUNTDOWN_MS);

    return () => clearTimeout(timer);
  }, [services]);
}
