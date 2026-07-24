import { Injectable, Logger } from '@nestjs/common';
import {
  buildStepRunTraceFromJob,
  BulkCreateExecutionDetails,
  InstrumentUsecase,
  mapEventTypeToTitle,
  StepRunRepository,
  TraceLogRepository,
} from '@novu/application-generic';
import { DalException, JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
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
    private traceLogRepository: TraceLogRepository
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
    if (storedJobs.length === 0) {
      return;
    }

    try {
      await this.traceLogRepository.createStepRun(
        storedJobs.map((job) =>
          buildStepRunTraceFromJob(job, {
            event_type: 'step_created',
            title: mapEventTypeToTitle('step_created'),
            status: 'success',
          })
        )
      );
    } catch (error) {
      Logger.error(
        { err: error, jobIds: storedJobs.map((job) => job._id) },
        'Failed to emit step_created traces'
      );
    }
  }
}
