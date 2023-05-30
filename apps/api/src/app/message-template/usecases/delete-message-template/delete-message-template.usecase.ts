import { Injectable } from '@nestjs/common';
import { ChangeRepository, DalException, MessageTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';

import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeleteMessageTemplateCommand } from './delete-message-template.command';

@Injectable()
export class DeleteMessageTemplate {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository
  ) {}

  async execute(command: DeleteMessageTemplateCommand): Promise<boolean> {
    try {
      await this.messageTemplateRepository.delete({
        _environmentId: command.environmentId,
        _id: command.messageTemplateId,
      });

      const deletedMessageTemplate = await this.messageTemplateRepository.findDeleted({
        _environmentId: command.environmentId,
        _id: command.messageTemplateId,
      });

      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item: deletedMessageTemplate,
          type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
          parentChangeId: command.parentChangeId,
          changeId: await this.changeRepository.getChangeId(
            command.environmentId,
            ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
            command.messageTemplateId
          ),
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
