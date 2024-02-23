import { errorMessage } from '@novu/design-system';
import { INotificationTemplate } from '@novu/shared';

import { TemplateCreationSourceEnum } from '../../templates/shared';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { OnboardingWorkflowRouteEnum } from '../consts/types';
import { StyledLink } from '../consts/shared';
import { useCreateWorkflowFromBlueprint } from '../../../hooks';
import { openInNewTab } from '../../../utils';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes.enum';

function buildWorkflowEditorUrl(workflow: INotificationTemplate, step?: OnboardingWorkflowRouteEnum) {
  const workflowRoute = parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: workflow._id! });
  if (step === OnboardingWorkflowRouteEnum.TEST_WORKFLOW) {
    return `${window.location.origin}${workflowRoute}/${OnboardingWorkflowRouteEnum.TEST_WORKFLOW}`;
  }

  const stepUuid = workflow.steps.find((el) => el.name?.toLowerCase() === step?.toLowerCase())?.uuid;
  if (step && stepUuid) {
    return `${window.location.origin}${workflowRoute}/${step}/${stepUuid}`;
  }

  return `${window.location.origin}${workflowRoute}`;
}

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

  return <StyledLink onClick={handleOpenWorkflowClick}>{children}</StyledLink>;
}
