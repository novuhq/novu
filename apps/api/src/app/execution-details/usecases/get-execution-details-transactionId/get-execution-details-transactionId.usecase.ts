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

    const hasMore = this.getHasMore(command.page, command.limit, data, totalCount);

    return {
      data: data || [],
      totalCount: totalCount || 0,
      hasMore,
      pageSize: command.limit,
      page: command.page,
    };
  }

  private getHasMore(page: number, LIMIT: number, data, totalCount) {
    const currentPaginationTotal = page * LIMIT + data.length;

    return currentPaginationTotal < totalCount;
  }
}
