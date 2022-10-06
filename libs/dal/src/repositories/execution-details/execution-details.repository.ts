import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

import { ExecutionDetailsEntity } from './execution-details.entity';
import { ExecutionDetails } from './execution-details.schema';

import { BaseRepository } from '../base-repository';

/**
 * Execution details is meant to be read only almost exclusively as a log history of the Jobs executions.
 */
export class ExecutionDetailsRepository extends BaseRepository<ExecutionDetailsEntity> {
  constructor() {
    super(ExecutionDetails, ExecutionDetailsEntity);
  }

  /**
   * As we have a status of potentially read confirmation for notifications that might have that kind
   * of confirmation there is potentially use of this method
   */
  public async updateStatus(executionDetailsId: string, status: ExecutionDetailsStatusEnum) {
    await this.update(
      {
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
      _organizationId: organizationId,
      _environmentId: environmentId,
      _notificationId: notificationId,
    });
  }
}
