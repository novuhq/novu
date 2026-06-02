import { Injectable } from '@nestjs/common';
import {
  BulkCreateExecutionDetails,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  InstrumentUsecase,
  StepRunRepository,
} from '@novu/application-generic';
import { DalException, JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { PlatformException } from '../../../shared/utils';
import { AddJob } from '../add-job';
import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    protected bulkCreateExecutionDetails: BulkCreateExecutionDetails,
    private stepRunRepository: StepRunRepository,
    private createExecutionDetails: CreateExecutionDetails
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

    await this.stepRunRepository.createMany(storedJobs, { status: JobStatusEnum.QUEUED });

    await this.emitStepCreatedTraces(storedJobs);

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

  private async emitStepCreatedTraces(storedJobs: JobEntity[]): Promise<void> {
    await Promise.all(
      storedJobs.map((job) =>
        this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
            detail: DetailEnum.STEP_CREATED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.SUCCESS,
            isTest: false,
            isRetry: false,
          })
        )
      )
    );
  }
}
