import { Injectable, Optional } from '@nestjs/common';
import {
  ControlValuesRepository,
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { PreferencesTypeEnum, WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';

import {
  GetWorkflowByIdsUseCase,
  DeletePreferencesUseCase,
  DeletePreferencesCommand,
  Instrument,
  InstrumentUsecase,
  SendWebhookMessage,
} from '@novu/application-generic';
import { DeleteWorkflowCommand } from './delete-workflow.command';
import { GetWorkflowWithPreferencesCommand } from '../get-workflow-with-preferences/get-workflow-with-preferences.command';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private deletePreferencesUsecase: DeletePreferencesUseCase,
    @Optional()
    private sendWebhookMessage?: SendWebhookMessage
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteWorkflowCommand): Promise<void> {
    const workflowEntity = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        ...command,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );

    await this.deleteRelatedEntities(command, workflowEntity);

    if (this.sendWebhookMessage) {
      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.WORKFLOW_DELETED,
        objectType: WebhookObjectTypeEnum.WORKFLOW,
        payload: {
          object: workflowEntity as unknown as Record<string, unknown>,
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });
    }
  }

  @Instrument()
  private async deleteRelatedEntities(command: DeleteWorkflowCommand, workflow: NotificationTemplateEntity) {
    await this.notificationTemplateRepository.withTransaction(async () => {
      await this.controlValuesRepository.deleteMany({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _workflowId: workflow._id,
      });

      if (workflow.steps.length > 0) {
        for (const step of workflow.steps) {
          await this.messageTemplateRepository.deleteById({
            _id: step._templateId,
            _environmentId: command.environmentId,
          });
        }
      }

      await this.deletePreferencesUsecase.execute(
        DeletePreferencesCommand.create({
          templateId: workflow._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          type: PreferencesTypeEnum.USER_WORKFLOW,
        })
      );

      await this.deletePreferencesUsecase.execute(
        DeletePreferencesCommand.create({
          templateId: workflow._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
        })
      );

      await this.notificationTemplateRepository.delete({
        _id: workflow._id,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    });
  }
}
