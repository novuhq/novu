import { useNavigate, useParams } from 'react-router-dom';
import { Step } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';
import { useEffectOnce } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { StartFromScratchTourTooltip } from './StartFromScratchTourTooltip';
import { useBasePath } from '../hooks/useBasePath';
import { useTourStorage } from '../hooks/useTourStorage';

const StartFromScratchTourSteps: Step[] = [
  {
    target: '[data-test-id="title"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    locale: { skip: 'Watch later' },
    tooltipComponent: StartFromScratchTourTooltip,
    offset: 0,
    floaterProps: {
      hideArrow: true,
    },
  },
  {
    target: '[data-test-id="title"]',
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
    target: '[data-test-id="title"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { skip: 'Watch later' },
    offset: 0,
  },
  {
    target: '[data-test-id="addNodeButton"]',
    content: '',
    placement: 'top',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { skip: 'Watch later' },
    offset: 0,
  },
  {
    target: '[data-test-id="button-add"]',
    content: '',
    placement: 'bottom',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: StartFromScratchTourTooltip,
    locale: { last: 'Got it' },
    offset: 0,
  },
];

export const useStartFromScratchTour = ({ startTour }: { startTour: () => void }) => {
  const basePath = useBasePath();
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const navigate = useNavigate();
  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isTouring = tourStorage.getCurrentTour('scratch', templateId) > -1 || true;

  useEffectOnce(() => {
    startTour();
    console.log({ steps });
  }, isTouring && steps.length > 0);

  return {
    StartFromScratchTourSteps: isTouring ? StartFromScratchTourSteps : [],
  };
};
