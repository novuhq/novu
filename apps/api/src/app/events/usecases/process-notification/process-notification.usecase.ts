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

import { DigestService, NotificationJob } from '../../services/digest/digest-service';

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
    const template = await this.digestService.getNotificationTemplate(command.environmentId, command.identifier);
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
      jobs.push(await this.prepareJob(command, notification, step));
    }
    await this.storeAndAddJobs(jobs);
  }

  private async processDigestChain(
    command: ProcessNotificationCommand,
    notification: NotificationEntity,
    steps: StepWithDelay[]
  ) {
    if (steps.length == 1) return; //Just digest step, so skip it
    if (
      steps[0]?.metadata?.type === DigestTypeEnum.BACKOFF &&
      (await this.digestService.needToBackoff(notification, steps[0], steps[1]))
    )
      return await this.processJobs(command, notification, steps.slice(1));

    let digestJob = await this.digestService.findOneAndUpdateDigest(notification, steps[0]);
    if (!digestJob || digestJob.digestedNotificationIds?.[0] !== notification._id) return; //old
    const preparedJob = await this.prepareJob(command, notification, steps[0]);
    preparedJob.status = JobStatusEnum.QUEUED;
    digestJob = await this.jobRepository.findOneAndUpdate(
      { _id: digestJob._id, _environmentId: notification._environmentId },
      { ...preparedJob },
      { new: true }
    );
    await this.workflowQueueService.addJob(digestJob);
  }

  private async storeAndAddJobs(jobs: NotificationJob[]) {
    jobs[0].status = JobStatusEnum.QUEUED; //first job to be queued
    const storedJobs = await this.jobRepository.storeJobs(jobs);
    for (const job of storedJobs) {
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
    await this.workflowQueueService.addJob(storedJobs[0]);
  }

  private async prepareJob(
    command: ProcessNotificationCommand,
    notification: NotificationEntity,
    stepWithDelay: StepWithDelay
  ): Promise<NotificationJob> {
    const { delay = 0, ...step } = stepWithDelay;
    if (!step.template) throw new ApiException('Step template was not found');
    const providerId = await this.digestService.getProviderId(
      notification._environmentId,
      notification._organizationId,
      command.userId,
      step.template.type
    );

    return {
      identifier: command.identifier,
      overrides: command.overrides,
      _userId: command.userId,
      transactionId: notification.transactionId,
      payload: notification.payload,
      _notificationId: notification._id,
      _environmentId: notification._environmentId,
      _organizationId: notification._organizationId,
      _subscriberId: notification._subscriberId,
      status: JobStatusEnum.PENDING,
      _templateId: notification._templateId,
      providerId,
      step,
      digest: step.metadata,
      type: step.template?.type,
      delay: delay,
      ...(command.actorSubscriber && { _actorId: command.actorSubscriber._id }),
    };
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
