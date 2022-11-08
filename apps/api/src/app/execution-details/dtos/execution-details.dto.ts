import { ApiProperty } from '@nestjs/swagger';
import { ExecutionDetailsEntity } from '@novu/dal';
import * as mongoose from 'mongoose';

import { CreateExecutionDetailsCommand } from '../usecases/create-execution-details/create-execution-details.command';

export class CreateExecutionDetailsResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  createdAt: string;
}

export const mapExecutionDetailsCommandToEntity = (command: CreateExecutionDetailsCommand): ExecutionDetailsEntity => {
  const {
    jobId: _jobId,
    environmentId: _environmentId,
    organizationId: _organizationId,
    subscriberId: _subscriberId,
    notificationId: _notificationId,
    notificationTemplateId: _notificationTemplateId,
    messageId: _messageId,
    ...nonUnderscoredFields
  } = command;

  return {
    _jobId,
    _environmentId,
    _organizationId,
    _subscriberId,
    _notificationId,
    _notificationTemplateId,
    _messageId,
    ...nonUnderscoredFields,
  };
};
