import { WorkflowQueue, MinimalJob } from './workflow-queue';
import { Injectable, Inject } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { RunJob } from '../../usecases/run-job/run-job.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class WorkflowQueueService {
  private readonly workflowQueue: WorkflowQueue;
  @Inject()
  private runJob: RunJob;

  constructor(private jobRepository: JobRepository, private createExecutionDetails: CreateExecutionDetails) {
    this.workflowQueue = new WorkflowQueue(this.workerProcessor, this.onCompleted, this.onFailed);
  }
  private async processNextJob({ data }, currentJobStatus: JobStatusEnum) {
    if (currentJobStatus === JobStatusEnum.CANCELED) return;
    await this.jobRepository.updateStatus(data._organizationId, data._id, currentJobStatus);
    if (currentJobStatus === JobStatusEnum.COMPLETED || !data?.step?.shouldStopOnFail) {
      await this.addChildJob(data);
    }
  }

  private async addChildJob(currentJob: JobEntity) {
    const nextJob = await this.jobRepository.findOneAndUpdate(
      {
        _environmentId: currentJob._environmentId,
        _organizationId: currentJob._organizationId,
        _parentId: currentJob._id,
        status: JobStatusEnum.PENDING,
      },
      {
        status: JobStatusEnum.QUEUED,
      },
      {
        new: true,
      }
    );
    if (nextJob) return await this.addJob(nextJob);
  }

  public async addJob(job: JobEntity | null) {
    if (job?.status !== JobStatusEnum.QUEUED) throw new ApiException(`Job status must be ${JobStatusEnum.QUEUED}`);
    this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: job.delay && job.delay > 0 ? DetailEnum.STEP_QUEUED_WITH_DELAY : DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );
    const backoffType = this.stepContainsFilter(job, 'webhook') ? this.workflowQueue.WEBHOOK_FILTER_BACKOFF : undefined;
    await this.workflowQueue.addToQueue(job.identifier, job, backoffType);
  }

  public async getJob(jobId: string) {
    return await this.workflowQueue.getJob(jobId);
  }

  public async promoteJob(jobId: string) {
    return await this.workflowQueue.promoteJob(jobId);
  }

  public async removeJob(jobId: string) {
    return await this.workflowQueue.removeJob(jobId);
  }

  onCompleted = async (job, returnvalue) => await this.processNextJob(job, returnvalue);

  onFailed = async (job) => {
    await this.updateFailedJob(job);
    if (job.opts.attempts && job.attemptsMade < job.opts.attempts) return;
    await this.processNextJob(job, JobStatusEnum.FAILED);
  };

  workerProcessor = async ({ data }: { data: MinimalJob }): Promise<JobStatusEnum> => {
    return await this.runJob.execute(data);
  };

  private stepContainsFilter(data: JobEntity, onFilter: string) {
    return data.step.filters?.some((filter) => {
      return filter.children?.some((child) => {
        return child.on === onFilter;
      });
    });
  }

  private async updateFailedJob(queuedJob) {
    const { opts, data, failedReason }: { opts: any; data: MinimalJob; failedReason: any } = queuedJob;
    const dbJob: any = await this.jobRepository.findById(data._id);
    const retry = opts.attempts && queuedJob.attemptsMade < queuedJob.opts.attempts;
    if (!retry) await this.jobRepository.setError(data._organizationId, data._id, failedReason);
    const stepHasWebhook = opts?.backoff?.type === this.workflowQueue.WEBHOOK_FILTER_BACKOFF;
    const detail = stepHasWebhook
      ? retry
        ? DetailEnum.WEBHOOK_FILTER_FAILED_RETRY
        : DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY
      : DetailEnum.JOB_FAILED;
    const source = stepHasWebhook ? ExecutionDetailsSourceEnum.WEBHOOK : ExecutionDetailsSourceEnum.INTERNAL;
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(dbJob),
        detail: detail,
        source: source,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: true,
        raw: JSON.stringify({ message: failedReason, attempt: queuedJob.attemptsMade }),
      })
    );
  }
}
