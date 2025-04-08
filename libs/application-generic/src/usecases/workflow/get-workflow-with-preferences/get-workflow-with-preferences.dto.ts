import { NotificationTemplateEntity } from '@novu/dal';
import { WorkflowPreferences } from '@novu/shared';

export class WorkflowWithPreferencesResponseDto extends NotificationTemplateEntity {
  userPreferences: WorkflowPreferences | null;

  defaultPreferences: WorkflowPreferences;
}
