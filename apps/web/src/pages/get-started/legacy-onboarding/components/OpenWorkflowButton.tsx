import { errorMessage } from '@novu/design-system';

import { useSegment } from '../../../../components/providers/SegmentProvider';
import { OnboardingWorkflowRouteEnum } from '../consts/types';
import { LinkButton } from '../consts/shared';
import { useCreateWorkflowFromBlueprint } from '../../../../hooks/index';
import { openInNewTab } from '../../../../utils/index';
import { buildWorkflowEditorUrl } from '../utils/workflowEditorUrl';
import { WorkflowCreationSourceEnum } from '@novu/shared';

export function OpenWorkflowButton({
  blueprintIdentifier,
  children,
  node,
}: {
  blueprintIdentifier: string;
  children: React.ReactNode;
  node?: OnboardingWorkflowRouteEnum;
}) {
  const segment = useSegment();
  const { createWorkflowFromBlueprint } = useCreateWorkflowFromBlueprint({
    onSuccess: (template) => {
      openInNewTab(buildWorkflowEditorUrl(template, node));
    },
    onError: () => {
      errorMessage('Something went wrong while creating a template from the blueprint. Please try again later.');
    },
  });

  const handleOpenWorkflowClick = () => {
    segment.track('[Get Started] Click Create Notification Template', {
      templateIdentifier: blueprintIdentifier,
      location: WorkflowCreationSourceEnum.ONBOARDING_GET_STARTED,
    });
    createWorkflowFromBlueprint({ blueprintIdentifier });
  };

  return <LinkButton onClick={handleOpenWorkflowClick}>{children}</LinkButton>;
}
