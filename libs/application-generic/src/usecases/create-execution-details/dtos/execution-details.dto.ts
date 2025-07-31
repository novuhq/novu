import { ApiProperty } from '@nestjs/swagger';
import { ExecutionDetailsEntity } from '@novu/dal';

import { CreateExecutionDetailsCommand } from '../create-execution-details.command';

export class CreateExecutionDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: string;
}

export const mapExecutionDetailsCommandToEntity = (
  command: CreateExecutionDetailsCommand
): Omit<ExecutionDetailsEntity, '_id' | 'createdAt'> => {
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
    _jobId: _jobId as string,
    _environmentId,
    _organizationId,
    _subscriberId,
    _notificationId,
    _notificationTemplateId: _notificationTemplateId as string,
    _messageId,
    ...nonUnderscoredFields,
  };
};
