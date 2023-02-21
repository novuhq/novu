import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  JobRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  NotificationEntity,
  NotificationStepEntity,
} from '@novu/dal';
import {
  StepTypeEnum,
  DigestTypeEnum,
  InAppProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  EmailProviderIdEnum,
} from '@novu/shared';
import { ProcessNotificationCommand } from './process-notification.command';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { Cached } from '../../../shared/interceptors';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { WorkflowQueueService } from '../../services/workflow-queue/workflow.queue.service';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { constructActiveDAG, getBackoffDate, StepWithDelay } from '../../helpers/helpers';

import { DigestService } from '../../services/digest/digest-service';

@Injectable()
export class ProcessNotification {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private workflowQueueService: WorkflowQueueService,
    protected digestService: DigestService,
    private getDecryptedIntegrations: GetDecryptedIntegrations
  ) {}

  public async execute(command: ProcessNotificationCommand): Promise<void> {
    const template = await this.getNotificationTemplate(command.environmentId, command.identifier);
    const channels: StepTypeEnum[] = template.steps.map((step) => step.template.type);
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
    const jobs: Omit<JobEntity, '_id'>[] = [];
    for (const step of steps) {
      jobs.push(await this.prepareJob(command, notification, step));
    }
    jobs[0].status = JobStatusEnum.QUEUED; //first job to be queued
    const storedJobs = await this.storeJobs(jobs);
    if (jobs[0].providerId == EmailProviderIdEnum.Mailgun) {
      console.log('storedJobs', storedJobs);
    }
    await this.addFirstJob(storedJobs[0]);
  }

  private async processDigestChain(
    command: ProcessNotificationCommand,
    notification: NotificationEntity,
    steps: StepWithDelay[]
  ) {
    if (steps.length == 1) return; //Just digest node, so skip it
    let digestJob: JobEntity;
    if (
      steps[0]?.metadata?.type !== DigestTypeEnum.BACKOFF ||
      !(await this.needToBackoff(notification, steps[0], steps[1]))
    ) {
      digestJob = await this.digestService.findOneAndUpdateDigest(notification, steps[0]);
      if (digestJob.digestedNotificationIds[0] !== notification._id) return; //old
    }
    let jobs: Omit<JobEntity, '_id'>[] = [];
    for (const step of steps) {
      jobs.push(await this.prepareJob(command, notification, step));
    }
    if (digestJob) {
      jobs[0].status = JobStatusEnum.QUEUED;
      digestJob = await this.jobRepository.findOneAndUpdate({ _id: digestJob._id }, { ...jobs[0] }, { new: true });
      jobs[1]._parentId = digestJob._id;
    } else {
      //backoff flow
      jobs[1].status = JobStatusEnum.QUEUED; //first job to be queued
    }
    jobs = jobs.slice(1); //skip digest job

    const storedJobs = await this.storeJobs(jobs);
    const jobToQueue = digestJob ? digestJob : storedJobs[0];
    await this.addFirstJob(jobToQueue);
  }

  private async storeJobs(jobs: Omit<JobEntity, '_id'>[]): Promise<JobEntity[]> {
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

    return storedJobs;
  }

  private async addFirstJob(job: JobEntity): Promise<void> {
    await this.workflowQueueService.addJob(job);
  }

  private async prepareJob(
    command,
    notification: NotificationEntity,
    stepWithDelay: StepWithDelay
  ): Promise<Omit<JobEntity, '_id'>> {
    const { delay = 0, ...step } = stepWithDelay;
    if (!step.template) throw new ApiException('Step template was not found');
    const providerId: string | undefined = await this.getProviderId(command, step.template.type);
    if (providerId == EmailProviderIdEnum.Mailgun) {
      console.log('notification', notification);
    }

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
    channels: StepTypeEnum[]
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

  @Cached(CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE)
  private async getNotificationTemplate(environmentId: string, identifier: string) {
    return await this.notificationTemplateRepository.findByTriggerIdentifier(environmentId, identifier);
  }

  private async needToBackoff(
    notification: NotificationEntity,
    digestStep: NotificationStepEntity,
    nextStep: NotificationStepEntity
  ) {
    const query = {
      updatedAt: {
        $gte: getBackoffDate(digestStep),
      },
      'step._templateId': nextStep._templateId,

      _templateId: notification._templateId,
      _environmentId: notification._environmentId,
      _subscriberId: notification._subscriberId,
    };
    if (digestStep.metadata?.digestKey) {
      query['payload.' + digestStep.metadata.digestKey] = notification.payload[digestStep.metadata.digestKey];
    }

    return !(await this.jobRepository.findOne(query));
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

  private async getProviderId(
    command: ProcessNotificationCommand,
    stepType: StepTypeEnum
  ): Promise<string | undefined> {
    const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(stepType);
    if (!channelType) return;
    const integrations = await this.getDecryptedIntegrations.execute(
      GetDecryptedIntegrationsCommand.create({
        channelType: channelType,
        active: true,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      })
    );
    const integration = integrations[0];

    return integration?.providerId ?? InAppProviderIdEnum.Novu;
  }
}
