import { useApp } from 'ink';
import React from 'react';
import { MAIN_FLOW } from './flows';
import { useStore } from './hooks/use-store';
import { ScreenContainer } from './primitives';
import { createRouter } from './router';
import { renderScreen } from './screen-registry';
import type { WizardServices } from './services';
import { OutroKind } from './wizard-session';

export type AppProps = {
  services: WizardServices;
};

const router = createRouter(MAIN_FLOW);

export function App({ services }: AppProps): React.ReactElement {
  const session = useStore(services.store.session);
  const { exit } = useApp();

  const screen = router.resolve(session);

  const handleScreenError = React.useCallback(
    (error: Error) => {
      services.store.setOutroData({
        kind: OutroKind.Error,
        message: `Wizard screen crashed: ${error.message}`,
      });
    },
    [services.store]
  );

  React.useEffect(() => {
    services.exit = (code = 0) => {
      setTimeout(() => exit(), 30);
      process.exitCode = code;
    };
  }, [services, exit]);

  return (
    <ScreenContainer screenKey={screen} onError={handleScreenError} startedAt={session.startedAt}>
      {renderScreen(screen, services)}
    </ScreenContainer>
  );
}
