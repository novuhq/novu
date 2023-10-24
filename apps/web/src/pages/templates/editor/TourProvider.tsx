import { useMantineColorScheme } from '@mantine/core';
import React, { useMemo, useCallback } from 'react';
import Joyride from 'react-joyride';
import { colors } from '@novu/design-system';

import { useDigestWorkflowTour } from './useDigestWorkflowTour';
import { useStartFromScratchTour } from './useStartFromScratchTour';

const TourContext = React.createContext({
  startTour: () => {},
  stopTour: () => {},
  stepTourIndex: 0,
  setStep: (index) => {},
});

export const useTour = () => React.useContext(TourContext);

export const TourProvider = React.memo(() => {
  const [{ run, stepTourIndex }, setState] = React.useState<{ run: boolean; stepTourIndex: number }>({
    run: false,
    stepTourIndex: 0,
  });
  const { colorScheme } = useMantineColorScheme();

  const startTour = useCallback(() => {
    setTimeout(() => setState((old) => ({ ...old, run: true })), 0);
  }, []);

  const stopTour = useCallback(() => {
    setTimeout(() => setState((old) => ({ ...old, run: false })), 0);
  }, []);

  const value = useMemo(
    () => ({
      startTour,
      stopTour,
      stepTourIndex,
      setStep: (index) => {
        // give the time for the target to be rendered
        setState((old) => ({ ...old, stepTourIndex: index, run: true }));
      },
    }),
    [startTour, stopTour, stepTourIndex]
  );

  const { digestTourSteps } = useDigestWorkflowTour({ startTour });
  const { startFromScratchTourSteps } = useStartFromScratchTour({ startTour });

  const steps = digestTourSteps.length > 0 ? digestTourSteps : startFromScratchTourSteps;

  const hasSteps = steps.length > 0;
  const shouldRun = run && hasSteps;

  return (
    <TourContext.Provider value={value}>
      <Joyride
        run={shouldRun}
        stepIndex={stepTourIndex}
        steps={steps}
        continuous
        showSkipButton
        disableOverlay={false}
        disableOverlayClose
        disableCloseOnEsc
        beaconComponent={React.forwardRef(() => null)}
        floaterProps={{
          offset: 0,
          styles: {
            floaterWithAnimation: {
              transition: 'opacity .5s ease-out',
            },
          },
        }}
        styles={{
          options: {
            arrowColor: colorScheme === 'dark' ? colors.B30 : colors.B98,
            zIndex: 200,
          },
          tooltipFooter: {
            flexDirection: 'row-reverse',
            justifyContent: 'space-between',
          },
          tooltipFooterSpacer: {
            flex: 'initial',
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
      />
    </TourContext.Provider>
  );
});
