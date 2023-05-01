import { JobRepository, NotificationRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import {
  StepTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';

import { AddJob } from '../add-job';
import {
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';

import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';
import { InstrumentUsecase } from '../../instrumentation';
import { BulkCreateExecutionDetails } from '../bulk-create-execution-details/bulk-create-execution-details.usecase';
import { BulkCreateExecutionDetailsCommand } from '../bulk-create-execution-details';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository,
    protected createExecutionDetails: BulkCreateExecutionDetails
  ) {}

  @InstrumentUsecase()
  async execute(command: StoreSubscriberJobsCommand) {
    const storedJobs = await this.jobRepository.storeJobs(command.jobs);

    console.log('storedJobs', storedJobs);

    this.createExecutionDetails.execute(
      BulkCreateExecutionDetailsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: storedJobs[0].subscriberId,
        details: storedJobs.map((job) => {
          return {
            ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
            detail: DetailEnum.STEP_CREATED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.PENDING,
            isTest: false,
            isRetry: false,
          };
        }),
      })
    );

    const firstJob = storedJobs[0];

    const channels = storedJobs
      .map((item) => item.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    console.log('channels', channels);

    await this.notificationRepository.update(
      {
        _organizationId: firstJob._organizationId,
        _id: firstJob._notificationId,
      },
      {
        $set: {
          channels: channels,
        },
      }
    );

    await this.addJob.execute({
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
    });
  }
}
