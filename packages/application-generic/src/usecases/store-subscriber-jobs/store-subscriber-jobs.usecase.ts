import { JobRepository, JobEntity, DalException } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';

import { AddJob } from '../add-job';
import {
  DetailEnum,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';

import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  BulkCreateExecutionDetails,
  BulkCreateExecutionDetailsCommand,
} from '../bulk-create-execution-details';
import { PlatformException } from '../../utils/exceptions';

const LOG_CONTEXT = 'StoreSubscriberJobs';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    protected bulkCreateExecutionDetails: BulkCreateExecutionDetails
  ) {}

  @InstrumentUsecase()
  async execute(command: StoreSubscriberJobsCommand) {
    let storedJobs;
    try {
      storedJobs = await this.jobRepository.storeJobs(command.jobs);
    } catch (e) {
      if (e instanceof DalException) {
        throw new PlatformException(e.message);
      }
      throw e;
    }

    this.createJobsExecutionDetails(storedJobs);
    const firstJob = storedJobs[0];

    const addJobCommand = {
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
    };

    await this.addJob.execute(addJobCommand);
  }

  @Instrument()
  private createJobsExecutionDetails(storedJobs: JobEntity[]) {
    this.bulkCreateExecutionDetails.execute(
      BulkCreateExecutionDetailsCommand.create({
        organizationId: storedJobs[0]._organizationId,
        environmentId: storedJobs[0]._environmentId,
        subscriberId: storedJobs[0]._subscriberId,
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
  }
}
