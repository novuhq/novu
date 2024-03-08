import { INotificationTemplate, INotificationTemplateStep } from '@novu/shared';

import { OnboardingWorkflowRouteEnum } from '../consts/types';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes.enum';

export const buildWorkflowEditorUrl = (workflow: INotificationTemplate, step?: OnboardingWorkflowRouteEnum) => {
  const workflowRoute = parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: workflow._id ?? '' });
  const baseUrl = `${window.location.origin}${workflowRoute}`;
  if (step === OnboardingWorkflowRouteEnum.TEST_WORKFLOW) {
    return `${baseUrl}/${OnboardingWorkflowRouteEnum.TEST_WORKFLOW}`;
  }

  const stepUuid = (workflow.steps as INotificationTemplateStep[]).find(
    (el) => el.name?.toLowerCase() === step?.toLowerCase()
  )?.uuid;
  if (step && stepUuid) {
    return `${baseUrl}/${step}/${stepUuid}`;
  }

  return baseUrl;
};
