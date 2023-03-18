import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  JobRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  NotificationEntity,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { ProcessNotificationCommand } from './process-notification.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { WorkflowQueueService } from '../../services/workflow-queue/workflow.queue.service';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { constructActiveDAG, StepWithDelay } from '../../helpers/helpers';
import { NotificationJob, prepareJob } from '../../helpers/job_preparation';
import { DigestService } from '../../services/digest/digest-service';

@Injectable()
export class ProcessNotification {
  constructor(
    private notificationRepository: NotificationRepository,
    private jobRepository: JobRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private workflowQueueService: WorkflowQueueService,
    protected digestService: DigestService
  ) {}

  public async execute(command: ProcessNotificationCommand): Promise<void> {
    const template = command.template;
    /*
     * channels belongs to jobs layer, so back propagating to notification is bad design,
     * in new design we do not need this, just keeping for backward compatibility, remove later.
     */
    const channels = template.steps.map((step) => step.template?.type);
    const notification = await this.createNotification(command, template._id, command.subscriber, channels);

    const dag = constructActiveDAG(template.steps, command.payload, command.overrides) || [];
    for (const steps of dag) {
      if (steps[0].template?.type === StepTypeEnum.DIGEST) await this.processDigestChain(command, notification, steps);
      else await this.processJobs(command, notification, steps);
    }
  }
  private async processJobs(
    command: ProcessNotificationCommand,
    notification: NotificationEntity,
    steps: StepWithDelay[]
  ) {
    const jobs: NotificationJob[] = [];
    for (const step of steps) {
      jobs.push(await prepareJob(command, notification, step));
    }
    await this.storeAndAddJobs(jobs);
  }

  private async processDigestChain(
    command: ProcessNotificationCommand,
    notification: NotificationEntity,
    steps: StepWithDelay[]
  ) {
    if (steps.length == 1) return; //Just digest step, so skip it
    if (steps[0]?.metadata?.type === DigestTypeEnum.BACKOFF) {
      const backoffJobs = await this.digestService.createBackoffJobs(command, notification, steps);
      if (backoffJobs && backoffJobs.length > 0) {
        for (const job of backoffJobs) await this.createExecutionDetail(job);

        return await this.workflowQueueService.addJob(backoffJobs[0]);
      }
    }
    const digestJob = await this.digestService.createOrUpdateDigestJob(command, notification, steps);
    if (digestJob) {
      await this.workflowQueueService.addJob(digestJob);
      await this.createExecutionDetail(digestJob);
    }
  }

  private async storeAndAddJobs(jobs: NotificationJob[]) {
    jobs[0].status = JobStatusEnum.QUEUED; //first job to be queued
    const storedJobs = await this.jobRepository.storeJobs(jobs);
    for (const job of storedJobs) await this.createExecutionDetail(job);
    await this.workflowQueueService.addJob(storedJobs[0]);
  }

  private async createExecutionDetail(job: JobEntity) {
    await this.createExecutionDetails.execute(
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

  private async createNotification(
    command: ProcessNotificationCommand,
    templateId: string,
    subscriber: SubscriberEntity,
    channels: (StepTypeEnum | undefined)[]
  ) {
    return await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: templateId,
      transactionId: command.transactionId,
      to: command.subscriber,
      payload: command.payload,
      channels: channels,
    });
  }

  public async validateTransactionIdProperty(
    transactionId: string,
    organizationId: string,
    environmentId: string
  ): Promise<void> {
    const found = await this.jobRepository.count({
      transactionId,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }
  }
}
