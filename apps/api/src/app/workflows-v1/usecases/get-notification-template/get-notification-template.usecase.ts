import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { GetWorkflowWithPreferencesCommand } from '../get-workflow-with-preferences/get-workflow-with-preferences.command';
import { GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { GetNotificationTemplateCommand } from './get-notification-template.command';

/**
 * @deprecated
 * This usecase is deprecated and will be removed in the future.
 * Please use the GetWorkflow usecase instead.
 */
@Injectable()
export class GetNotificationTemplate {
  constructor(private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const workflow = await this.getWorkflowWithPreferencesUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        workflowIdOrInternalId: command.workflowIdOrIdentifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    return workflow;
  }
}
