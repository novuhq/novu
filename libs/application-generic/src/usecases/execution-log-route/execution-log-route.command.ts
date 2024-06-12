import { Injectable } from '@nestjs/common';
import { IsMongoId, IsNotEmpty } from 'class-validator';

import { IJob } from '@novu/shared';
import { CreateExecutionDetailsCommand } from '../create-execution-details';

@Injectable()
export class ExecutionLogRouteCommand extends CreateExecutionDetailsCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly userId: string;

  static getDetailsFromJob(
    job: IJob
  ): Pick<
    ExecutionLogRouteCommand,
    | 'environmentId'
    | 'organizationId'
    | 'subscriberId'
    | '_subscriberId'
    | 'jobId'
    | 'notificationId'
    | 'notificationTemplateId'
    | 'providerId'
    | 'transactionId'
    | 'channel'
    | 'expireAt'
    | 'userId'
  > {
    return {
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      subscriberId: job.subscriberId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      _subscriberId: job._subscriberId ? job._subscriberId : job.subscriberId,
      jobId: job._id,
      notificationId: job._notificationId,
      notificationTemplateId: job._templateId,
      providerId: job.providerId,
      transactionId: job.transactionId,
      userId: job._userId,
      channel: job.type,
      expireAt: job.expireAt,
    };
  }
}
