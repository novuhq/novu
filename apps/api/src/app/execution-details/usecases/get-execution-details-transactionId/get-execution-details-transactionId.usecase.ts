import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository } from '@novu/dal';
import { GetExecutionDetailsByTransactionIdCommand } from './get-execution-details-transactionId.command';
import { ExecutionDetailsPaginatedResponseDto } from '../../dtos/execution-details-response.dto';

@Injectable()
export class GetExecutionDetailsByTransactionId {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: GetExecutionDetailsByTransactionIdCommand): Promise<ExecutionDetailsPaginatedResponseDto> {
    const COUNT_LIMIT = 1000;

    if (command.limit > COUNT_LIMIT) {
      throw new Error(`Limit cannot be greater than ${COUNT_LIMIT}`);
    }

    const { data, totalCount } = await this.executionDetailsRepository.findAllNotificationExecutionsByTransactionId(
      command.transactionId,
      command.environmentId,
      command.page * command.limit,
      command.limit
    );

    return { page: command.page, data, totalCount, pageSize: command.limit };
  }
}
