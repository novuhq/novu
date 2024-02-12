import { GetActiveIntegrationsStatus } from './get-active-integrations-status/get-active-integrations-status.usecase';
import { ChangeTemplateActiveStatus } from './change-template-active-status/change-template-active-status.usecase';
import { UpdateNotificationTemplate } from './update-notification-template/update-notification-template.usecase';
import { GetNotificationTemplates } from './get-notification-templates/get-notification-templates.usecase';
import { CreateNotificationTemplate } from './create-notification-template';
import { GetNotificationTemplate } from './get-notification-template/get-notification-template.usecase';
import { DeleteNotificationTemplate } from './delete-notification-template/delete-notification-template.usecase';
import { GetWorkflowVariables } from './get-workflow-variables/get-workflow-variables.usecase';

export const USE_CASES = [
  GetActiveIntegrationsStatus,
  ChangeTemplateActiveStatus,
  UpdateNotificationTemplate,
  GetNotificationTemplates,
  CreateNotificationTemplate,
  GetNotificationTemplate,
  DeleteNotificationTemplate,
  GetWorkflowVariables,
];
