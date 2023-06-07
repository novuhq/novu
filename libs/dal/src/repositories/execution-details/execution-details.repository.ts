import { ExecutionDetailsStatusEnum } from '@novu/shared';

import { ExecutionDetailsEntity, ExecutionDetailsDBModel } from './execution-details.entity';
import { ExecutionDetails } from './execution-details.schema';
import { BaseRepository } from '../base-repository';
import { EnforceEnvId } from '../../types/enforce';

/**
 * Execution details is meant to be read only almost exclusively as a log history of the Jobs executions.
 */
export class ExecutionDetailsRepository extends BaseRepository<
  ExecutionDetailsDBModel,
  ExecutionDetailsEntity,
  EnforceEnvId
> {
  constructor() {
    super(ExecutionDetails, ExecutionDetailsEntity);
  }

  /**
   * As we have a status of potentially read confirmation for notifications that might have that kind
   * of confirmation there is potentially use of this method
   */
  public async updateStatus(environmentId: string, executionDetailsId: string, status: ExecutionDetailsStatusEnum) {
    await this.update(
      {
        _environmentId: environmentId,
        _id: executionDetailsId,
      },
      {
        $set: {
          status,
        },
      }
    );
  }

  /**
   * Activity feed might need to retrieve all the executions of a notification.
   */
  public async findAllNotificationExecutions(organizationId: string, environmentId: string, notificationId: string) {
    return await this.find({
      _environmentId: environmentId,
      _notificationId: notificationId,
    });
  }

  /**
   * Activity feed might need to retrieve all the executions of a notification by transactionId.
   */
  public async findAllNofitificationExecutionsByTransactionId(
    transactionId: string,
    environmentId: string,
    skip = 0,
    limit = 10
  ) {
    const requestQuery = {
      _environmentId: environmentId,
      transactionId: transactionId,
    };

    const [items, totalCount] = await Promise.all([
      this.find(requestQuery, '', { sort: { createdAt: -1 }, skip, limit }),
      this.count(requestQuery),
    ]);

    return { totalCount, data: this.mapEntities(items) };
  }
}
