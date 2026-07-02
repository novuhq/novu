import React from 'react';
import { Screen } from './router';
import { ExitScreen } from './screens/exit-screen';
import { RunScreen } from './screens/run-screen';
import type { WizardServices } from './services';

/**
 * Single source of truth that maps a {@link Screen} to its renderer. To add a
 * new screen: register it here and add a `FlowEntry` in `flows.ts`. No other
 * file needs to change.
 */
export function renderScreen(screen: Screen, services: WizardServices): React.ReactElement {
  switch (screen) {
    case Screen.Run:
      return <RunScreen services={services} />;
    case Screen.Exit:
    default:
      return <ExitScreen services={services} />;
  }
}
