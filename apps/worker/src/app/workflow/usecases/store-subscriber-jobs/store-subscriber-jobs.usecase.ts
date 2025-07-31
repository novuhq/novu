import { DalException, JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import {
  BulkCreateExecutionDetails,
  BulkCreateExecutionDetailsCommand,
  CreateExecutionDetailsCommand,
  DetailEnum,
  Instrument,
  InstrumentUsecase,
  StepRunRepository,
} from '@novu/application-generic';
import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';
import { AddJob } from '../add-job';
import { PlatformException } from '../../../shared/utils';


@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    protected bulkCreateExecutionDetails: BulkCreateExecutionDetails,
    private stepRunRepository: StepRunRepository
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
    await this.stepRunRepository.createMany(storedJobs, { status: JobStatusEnum.QUEUED });
    const firstJob = storedJobs[0];

    const addJobCommand = {
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
      bridge: firstJob.bridge,
      controlVariables: firstJob.controlVariables,
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
