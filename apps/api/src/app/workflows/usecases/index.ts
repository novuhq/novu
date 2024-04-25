import { CreateWorkflow, UpdateWorkflow } from '@novu/application-generic';

import { GetActiveIntegrationsStatus } from './get-active-integrations-status/get-active-integrations-status.usecase';
import { ChangeTemplateActiveStatus } from './change-template-active-status/change-template-active-status.usecase';
import { GetNotificationTemplates } from './get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplate } from './get-notification-template/get-notification-template.usecase';
import { DeleteNotificationTemplate } from './delete-notification-template/delete-notification-template.usecase';
import { GetWorkflowVariables } from './get-workflow-variables/get-workflow-variables.usecase';

export const USE_CASES = [
  GetActiveIntegrationsStatus,
  ChangeTemplateActiveStatus,
  CreateWorkflow,
  UpdateWorkflow,
  GetNotificationTemplates,
  GetNotificationTemplate,
  DeleteNotificationTemplate,
  GetWorkflowVariables,
];
