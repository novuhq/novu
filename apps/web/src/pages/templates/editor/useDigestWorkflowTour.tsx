import { useNavigate, useParams } from 'react-router-dom';
import { Step } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';
import { useEffectOnce } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { DigestWorkflowTourTooltip } from './DigestWorkflowTourTooltip';
import { useBasePath } from '../hooks/useBasePath';
import { useTourStorage } from '../hooks/useTourStorage';

const digestTourSteps: Step[] = [
  {
    target: '[data-test-id="digest-step-settings-interval"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: DigestWorkflowTourTooltip,
    locale: { skip: 'Skip tour' },
    offset: 0,
  },
  {
    target: '[data-test-id="custom-code-editor"]',
    content: '',
    placement: 'right',
    disableBeacon: true,
    hideBackButton: true,
    locale: { skip: 'Skip tour' },
    tooltipComponent: DigestWorkflowTourTooltip,
    offset: 0,
  },
  {
    target: '[data-test-id="test-workflow-btn"]',
    content: '',
    placement: 'top',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: DigestWorkflowTourTooltip,
    locale: { last: 'Got it' },
    offset: 0,
  },
];

export const useDigestWorkflowTour = ({ startTour }: { startTour: () => void }) => {
  const basePath = useBasePath();
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const navigate = useNavigate();
  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isTouring = tourStorage.getCurrentTour('digest', templateId) > -1;

  useEffectOnce(() => {
    // once there are steps select the node with type DIGEST and start the tour
    const digestStep = steps.find((step) => step.template?.type === StepTypeEnum.DIGEST);
    if (digestStep) {
      navigate(basePath + '/' + StepTypeEnum.DIGEST + '/' + digestStep?.uuid);
      startTour();
    }
  }, isTouring && steps.length > 0);

  return {
    digestTourSteps: isTouring ? digestTourSteps : [],
  };
};
