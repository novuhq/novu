import { Injectable, NotFoundException } from '@nestjs/common';
import { DalException, MessageTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';

import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeleteMessageTemplateCommand } from './delete-message-template.command';

@Injectable()
export class DeleteMessageTemplate {
  constructor(private messageTemplateRepository: MessageTemplateRepository, private createChange: CreateChange) {}

  async execute(command: DeleteMessageTemplateCommand): Promise<boolean> {
    try {
      const template = await this.messageTemplateRepository.findById(command.messageTemplateId, command.environmentId);
      if (!template) {
        throw new NotFoundException(`Message Template with id ${command.messageTemplateId} not found`);
      }

      await this.messageTemplateRepository.delete({
        _environmentId: command.environmentId,
        _id: command.messageTemplateId,
      });

      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item: template,
          type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
          parentChangeId: command.parentChangeId,
          changeId: MessageTemplateRepository.createObjectId(),
        })
      );

      return true;
    } catch (error) {
      if (error instanceof DalException) {
        throw new ApiException(error.message);
      }
      throw error;
    }
  }
}
