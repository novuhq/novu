import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Step } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';

import { useTemplateEditorContext } from './TemplateEditorProvider';
import { ActivePageEnum } from '../../../constants/editorEnums';
import { useEffectOnce } from '../../../hooks';
import { IForm } from '../components/formTypes';
// import { DigestWorkflowTourTooltip } from './DigestWorkflowTourTooltip';

const digestTourSteps: Step[] = [
  {
    target: '[data-test-id="digest-step-settings-interval"]',
    content: 'Setup digest settings',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    // tooltipComponent: DigestWorkflowTourTooltip,
    locale: { skip: 'Skip tour' },
    offset: 0,
  },
  {
    target: '[data-test-id="email-step-settings-edit"]',
    content: 'Setup email settings',
    placement: 'left',
    disableBeacon: true,
    hideBackButton: true,
    locale: { skip: 'Skip tour' },
    // tooltipComponent: DigestWorkflowTourTooltip,
    offset: 0,
  },
  {
    target: '[data-test-id="test-workflow-btn"]',
    content: 'Setup digest settings',
    placement: 'bottom',
    disableBeacon: true,
    hideBackButton: true,
    // tooltipComponent: DigestWorkflowTourTooltip,
    locale: { last: 'Got it' },
    offset: 0,
  },
];

export const useDigestWorkflowTour = ({ startTour }: { startTour: () => void }) => {
  const { setSelectedNodeId, setActivePage } = useTemplateEditorContext();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isDigestTour = queryParams.get('tour') == 'digest';
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');

  useEffect(() => {
    if (isDigestTour) {
      setActivePage(ActivePageEnum.WORKFLOW);
    }
  }, []);

  useEffectOnce(() => {
    // once there are steps select the node with type DIGEST and start the tour
    const digestStep = steps.find((step) => step.template?.type === StepTypeEnum.DIGEST);
    if (digestStep) {
      setSelectedNodeId(digestStep.id || '');
      startTour();
    }
  }, isDigestTour && steps.length > 0);

  return {
    digestTourSteps: isDigestTour ? digestTourSteps : [],
  };
};
