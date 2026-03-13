import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  DeletePreferencesCommand,
  DeletePreferencesUseCase,
  GetWorkflowByIdsUseCase,
  GetWorkflowWithPreferencesCommand,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  SendWebhookMessage,
} from '@novu/application-generic';
import {
  ClientSession,
  ControlValuesRepository,
  LocalizationResourceEnum,
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { PreferencesTypeEnum, WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { DeleteWorkflowCommand } from './delete-workflow.command';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private deletePreferencesUsecase: DeletePreferencesUseCase,
    private moduleRef: ModuleRef,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage
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

  @Instrument()
  private async deleteRelatedEntities(command: DeleteWorkflowCommand, workflow: NotificationTemplateEntity) {
    const deleteOps = async (session: ClientSession) => {
      const sessionOptions = { session };
      await this.controlValuesRepository.deleteMany(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _workflowId: workflow._id,
        },
        sessionOptions
      );

      if (workflow.steps.length > 0) {
        for (const step of workflow.steps) {
          await this.messageTemplateRepository.deleteById(
            {
              _id: step._templateId,
              _environmentId: command.environmentId,
            },
            sessionOptions
          );
        }
      }

      await this.deletePreferencesUsecase.execute(
        DeletePreferencesCommand.create({
          templateId: workflow._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          type: PreferencesTypeEnum.USER_WORKFLOW,
          session,
        })
      );

      await this.deletePreferencesUsecase.execute(
        DeletePreferencesCommand.create({
          templateId: workflow._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
          session,
        })
      );

      await this.deleteTranslationGroup(command, session);

      await this.notificationTemplateRepository.delete({
        _id: workflow._id,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    };

    if (command.session) {
      await deleteOps(command.session);
    } else {
      await this.notificationTemplateRepository.withTransaction(deleteOps);
    }
  }

  private async deleteTranslationGroup(command: DeleteWorkflowCommand, session: ClientSession) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const deleteTranslationGroup = this.moduleRef.get(require('@novu/ee-translation')?.DeleteTranslationGroup, {
        strict: false,
      });

      await deleteTranslationGroup.execute({
        resourceId: command.workflowIdOrInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        session,
      });
    } catch (error) {
      this.logger.error(`Failed to delete translations for workflow`, {
        workflowIdentifier: command.workflowIdOrInternalId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // translation group might not be present, so we can ignore the error
    }
  }
}
