import { INotificationTemplate } from '@novu/shared';

import { ROUTES } from '../../../constants/routes.enum';
import { useCreateTemplateFromBlueprint } from '../../../api/hooks';
import { errorMessage } from '../../../utils/notifications';
import { getBlueprintTemplateById, getTemplateById } from '../../../api/notification-templates';
import { getWorkflowBlueprintDetails } from '../../../utils';
import { TemplateCreationSourceEnum } from '../../templates/shared';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { OnboardingWorkflowRouteEnum } from '../consts/types';
import { StyledLink } from '../consts/shared';

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

  const { createTemplateFromBlueprint } = useCreateTemplateFromBlueprint({
    onSuccess: (template) => {
      const url = buildUrl(template, node);
      openNewTab(url);
    },
    onError: (error) => {
      errorMessage('Something went wrong while creating a template from the blueprint. Please try again later.');
    },
  });

  const openNewTab = (url) => window.open(url, '_blank', 'noreferrer noopener');

  const handleOpenWorkflowClick = async () => {
    segment.track('[Get Started] Click Create Notification Template', {
      templateIdentifier: blueprintIdentifier,
      location: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED,
    });

    const blueprintData = await getBlueprint();

    if (!blueprintData) {
      return;
    }

    try {
      const workflowIdentifier = blueprintData.name.toLowerCase();
      const workflowData = await getTemplateById(workflowIdentifier);
      if (workflowData) {
        const url = buildUrl(workflowData, node);
        openNewTab(url);
      }
    } catch (error) {
      createTemplateFromBlueprint({
        blueprint: blueprintData,
        params: { __source: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED },
      });
    }
  };

  const getBlueprint = async (): Promise<INotificationTemplate | undefined> => {
    segment.track('[Get Started] Click Create Notification Template', {
      templateIdentifier: blueprintIdentifier,
      location: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED,
    });

    let blueprintData: INotificationTemplate | undefined;

    try {
      blueprintData = await getBlueprintTemplateById(blueprintIdentifier);
      if (blueprintData) {
        const { name: blueprintName } = getWorkflowBlueprintDetails(blueprintData.name);
        blueprintData = { ...blueprintData, name: blueprintName };
      } else {
        errorMessage('Failed to fetch blueprint data');

        return;
      }
    } catch (error) {
      errorMessage('Failed to fetch blueprint data');

      return;
    }

    return blueprintData;
  };

  return <StyledLink onClick={() => handleOpenWorkflowClick()}>{children}</StyledLink>;
}

function buildUrl(workflowData, node?: OnboardingWorkflowRouteEnum) {
  const nodeRoute = getNodeRoute(node, workflowData);

  return `${window.location.origin}${ROUTES.WORKFLOWS_EDIT_TEMPLATEID.replace(
    ':templateId',
    workflowData._id
  )}${nodeRoute}`;
}
function getNodeRoute(node: OnboardingWorkflowRouteEnum | undefined, workflowData: INotificationTemplate): string {
  if (!node) {
    return '';
  }

  const nodeUuid = workflowData.steps.find((step) => step.name?.toLowerCase() === node.toLowerCase())?.uuid;
  const idRoute = nodeUuid ? `/${nodeUuid}` : '';
  const nodeRoute = `/${node}`;

  return `${nodeRoute}${idRoute}`;
}
