import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { ExecutionDetailsEntity } from './execution-details.entity';
import { ExecutionDetails } from './execution-details.schema';
import { BaseRepository, Omit } from '../base-repository';
import { Document, FilterQuery } from 'mongoose';

class PartialIntegrationEntity extends Omit(ExecutionDetailsEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

/**
 * Execution details is meant to be read only almost exclusively as a log history of the Jobs executions.
 */
export class ExecutionDetailsRepository extends BaseRepository<EnforceEnvironmentQuery, ExecutionDetailsEntity> {
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
      _organizationId: organizationId,
      _environmentId: environmentId,
      _notificationId: notificationId,
    });
  }
}
