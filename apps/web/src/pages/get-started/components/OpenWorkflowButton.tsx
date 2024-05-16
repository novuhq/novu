import { errorMessage } from '@novu/design-system';

import { TemplateCreationSourceEnum } from '../../templates/shared';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { OnboardingWorkflowRouteEnum } from '../consts/types';
import { LinkButton } from '../consts/shared';
import { useCreateWorkflowFromBlueprint } from '../../../hooks';
import { openInNewTab } from '../../../utils';
import { buildWorkflowEditorUrl } from '../utils/workflowEditorUrl';

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
      location: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED,
    });
    createWorkflowFromBlueprint({ blueprintIdentifier });
  };

  return <LinkButton onClick={handleOpenWorkflowClick}>{children}</LinkButton>;
}
