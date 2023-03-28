import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Step } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';

import { useEffectOnce } from '../../../hooks';
import { IForm } from '../components/formTypes';
import { DigestWorkflowTourTooltip } from './DigestWorkflowTourTooltip';
import { useBasePath } from '../hooks/useBasePath';

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
    target: '[data-test-id="email-step-settings-edit"]',
    content: '',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    locale: { skip: 'Skip tour' },
    tooltipComponent: DigestWorkflowTourTooltip,
    offset: 0,
  },
  {
    target: '[data-test-id="test-workflow-btn"]',
    content: '',
    placement: 'bottom',
    disableBeacon: true,
    hideBackButton: true,
    tooltipComponent: DigestWorkflowTourTooltip,
    locale: { last: 'Got it' },
    offset: 0,
  },
];

export const useDigestWorkflowTour = ({ startTour }: { startTour: () => void }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isDigestTour = queryParams.get('tour') == 'digest';
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const navigate = useNavigate();
  const basePath = useBasePath();

  useEffect(() => {
    if (isDigestTour) {
      navigate(basePath + '/');
    }
  }, []);

  useEffectOnce(() => {
    // once there are steps select the node with type DIGEST and start the tour
    const digestStep = steps.find((step) => step.template?.type === StepTypeEnum.DIGEST);
    if (digestStep) {
      setTimeout(() => {
        navigate(basePath + '/' + StepTypeEnum.DIGEST + '/' + digestStep?.uuid);
        startTour();
      }, 0);
    }
  }, isDigestTour && steps.length > 0);

  return {
    digestTourSteps: isDigestTour ? digestTourSteps : [],
  };
};
