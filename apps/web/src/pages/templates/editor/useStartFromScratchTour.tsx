import { Step } from 'react-joyride';
import { useParams } from 'react-router-dom';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useEffectOnce } from '../../../hooks';
import { useTourStorage } from '../hooks/useTourStorage';
import { StartFromScratchTourTooltip } from './StartFromScratchTourTooltip';

const StartFromScratchTourSteps: Step[] = [
  {
    target: '[class="react-flow__controls"]',
    content: '',
    placement: 'right-end',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { skip: 'Watch later', next: 'Show me' },
    offset: 0,
    floaterProps: {
      hideArrow: true,
    },
    disableOverlay: true,
  },
  {
    target: '[data-test-id="name-input"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { skip: 'Watch later' },
    offset: 0,
  },
  {
    target: '[data-test-id="settings-page"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    locale: { skip: 'Watch later' },
    tooltipComponent: StartFromScratchTourTooltip,
    offset: 0,
  },
  {
    target: '[data-test-id="button-add"]',
    content: '',
    placement: 'bottom',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { skip: 'Watch later' },
    offset: 0,
  },
  {
    target: '[data-test-id="node-triggerSelector"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { last: 'Got it' },
    offset: 0,
  },
];

export const useStartFromScratchTour = ({ startTour }: { startTour: () => void }) => {
  const { currentUser } = useAuthContext();

  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isDigestTouring = tourStorage.getCurrentTour('digest', templateId) > -1;

  useEffectOnce(() => {
    const showOnboardingTour = currentUser?.showOnBoardingTour ?? 0;
    if (showOnboardingTour < 2 && !isDigestTouring && currentUser) {
      startTour();
    }
  }, !isDigestTouring && !!currentUser);

  return {
    startFromScratchTourSteps: !isDigestTouring ? StartFromScratchTourSteps : [],
  };
};
