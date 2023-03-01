import { JobEntity, JobRepository, NotificationTemplateRepository, NotificationRepository } from '@novu/dal';
import { Injectable, Logger } from '@nestjs/common';
import { StepTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';

import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';

import { AddJob } from '../add-job/add-job.usecase';

import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  async execute(command: StoreSubscriberJobsCommand) {
    const storedJobs = await this.jobRepository.storeJobs(command.jobs);

    for (const job of storedJobs) {
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CREATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

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
