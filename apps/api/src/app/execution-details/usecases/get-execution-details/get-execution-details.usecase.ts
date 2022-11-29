import { Injectable } from '@nestjs/common';
import { ExecutionDetailsEntity, ExecutionDetailsRepository } from '@novu/dal';
import { GetExecutionDetailsCommand } from './get-execution-details.command';

@Injectable()
export class GetExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: GetExecutionDetailsCommand): Promise<ExecutionDetailsEntity[]> {
    return this.executionDetailsRepository.find({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
    });
  }
}
