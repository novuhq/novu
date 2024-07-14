import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import {
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  DeleteMessageTemplate,
  DeleteMessageTemplateCommand,
  InvalidateCacheService,
} from '@novu/application-generic';
import { WorkflowTypeEnum } from '@novu/shared';

import { DeleteWorkflowCommand } from './delete-workflow.command';

@Injectable()
export class DeleteWorkflow {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private invalidateCache: InvalidateCacheService,
    private deleteMessageTemplate: DeleteMessageTemplate
  ) {}

  async execute(command: DeleteWorkflowCommand) {
    const workflow = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.workflowId,
    });
    if (!workflow) {
      throw new NotFoundException(`Could not find workflow with id ${command.workflowId}`);
    }

    for (const step of workflow.steps) {
      await this.deleteMessageTemplate.execute(
        DeleteMessageTemplateCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          messageTemplateId: step._templateId,
          workflowType: WorkflowTypeEnum.BRIDGE,
        })
      );
    }

    await this.notificationTemplateRepository.delete({
      _environmentId: command.environmentId,
      _id: command.workflowId,
    });

    const item: NotificationTemplateEntity = (
      await this.notificationTemplateRepository.findDeleted({
        _environmentId: command.environmentId,
        _id: command.workflowId,
      })
    )?.[0];

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: item._id,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: item.triggers[0].identifier,
        _environmentId: command.environmentId,
      }),
    });

    return true;
  }
}
