import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { GetWorkflowByIdsCommand } from '@novu/application-generic';
import { GetNotificationTemplateCommand } from './get-notification-template.command';
import { GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences/get-workflow-with-preferences.usecase';

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
      GetWorkflowByIdsCommand.create({
        workflowIdOrInternalId: command.workflowIdOrIdentifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    return workflow;
  }
}
