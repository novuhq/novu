import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository } from '@novu/dal';
import { GetExecutionDetailsByTransactionIdCommand } from './get-execution-details-transactionId.command';
import { ExecutionDetailsFilterResponseDto } from '../../dtos/execution-details-response.dto';

@Injectable()
export class GetExecutionDetailsByTransactionId {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: GetExecutionDetailsByTransactionIdCommand): Promise<ExecutionDetailsFilterResponseDto> {
    const { data, totalCount } = await this.executionDetailsRepository.findAllNofitificationExecutionsByTransactionId(
      command.transactionId,
      command.environmentId,
      command.page * command.limit,
      command.limit
    );

    return { page: command.page, data, totalCount, pageSize: command.limit };
  }
}
