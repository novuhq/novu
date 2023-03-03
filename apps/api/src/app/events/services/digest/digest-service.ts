import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  NotificationTemplateRepository,
  JobRepository,
  NotificationEntity,
  NotificationStepEntity,
  JobStatusEnum,
  JobEntity,
} from '@novu/dal';
import { StepTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE, InAppProviderIdEnum } from '@novu/shared';
import { get } from 'lodash';
import { constructActiveDAG, getBackoffDate, StepWithDelay } from '../../helpers/helpers';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { Cached } from '../../../shared/interceptors';
import { ApiException } from '../../../shared/exceptions/api.exception';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { v5 as uuidv5 } from 'uuid';

export type NotificationJob = Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class DigestService {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    private getDecryptedIntegrations: GetDecryptedIntegrations
  ) {}

  private async findOneAndUpdate(notification: NotificationEntity, step: NotificationStepEntity, upsert: boolean) {
    const digestRunKey = this.createDigestRunKey(notification, step);
    const query = {
      _environmentId: notification._environmentId,
      digestRunKey,
      status: JobStatusEnum.QUEUED,
      type: StepTypeEnum.DIGEST,
    };

    return await this.jobRepository.findOneAndUpdate(
      query,
      {
        status: JobStatusEnum.QUEUED,
        $push: {
          digestedNotificationIds: notification._id,
        },
      },
      {
        projection: { _id: 1, digestedNotificationIds: { $slice: 1 } },
        upsert,
        new: true,
      }
    );
  }
  public async findOneAndUpdateDigest(notification: NotificationEntity, step: NotificationStepEntity) {
    try {
      return await this.findOneAndUpdate(notification, step, true);
    } catch (error) {
      if (error.message.includes('duplicate key')) return await this.findOneAndUpdate(notification, step, false);
      else throw new ApiException(error);
    }
  }

  private createDigestRunKey(notification: NotificationEntity, step: NotificationStepEntity) {
    const { _environmentId, _subscriberId, _templateId, payload } = notification;
    let plainKey = `${_environmentId}${_subscriberId}${_templateId}${step._templateId}`;
    if (step.metadata?.digestKey) plainKey += step.metadata?.digestKey + get(payload, step.metadata?.digestKey);

    return uuidv5(plainKey, uuidv5.URL);
  }

  public async needToBackoff(
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
    this.setDigestCondition(query, digestStep, notification.payload);

    return !(await this.jobRepository.findOne(query));
  }
  private setDigestCondition(query, digestStep: NotificationStepEntity, payload) {
    if (digestStep.metadata?.digestKey) {
      query['payload.' + digestStep.metadata.digestKey] = get(payload, digestStep.metadata.digestKey);
    }
  }

  private async getDigestedPayload(job: JobEntity) {
    if (job.step?.template?.type === StepTypeEnum.DIGEST) return [];
    const digestIds = job.digestedNotificationIds ?? [];
    const digestedPayload =
      digestIds.length > 0
        ? await this.notificationRepository.find(
            { _id: { $in: digestIds }, _environmentId: job._environmentId },
            { payload: 1 }
          )
        : [];

    return digestedPayload.map((dp) => dp.payload);
  }

  public async getPayload(job: JobEntity) {
    const payload = job.payload ?? {};
    const digestPayload = await this.getDigestedPayload(job);
    if (digestPayload.length > 0) {
      payload.step = {
        digest: !!digestPayload?.length,
        events: digestPayload,
        total_count: digestPayload.length,
      };
    }

    return payload;
  }

  public async createDigestChildJobs(digestJob: JobEntity) {
    const template = await this.getNotificationTemplate(digestJob._environmentId, digestJob.identifier);
    const dag = constructActiveDAG(template.steps, digestJob.payload, digestJob.overrides) || [];
    let digestBranch = dag.find((branch) => branch[0]._templateId === digestJob.step?._templateId);
    digestBranch = digestBranch?.slice(1);
    if (!digestBranch) return;
    const jobs: NotificationJob[] = [];
    for (const step of digestBranch) {
      jobs.push(await this.prepareChildJob(digestJob, step));
    }
    jobs[0]._parentId = digestJob._id;

    return await this.jobRepository.storeJobs(jobs);
  }

  private async prepareChildJob(parentJob: JobEntity, stepWithDelay: StepWithDelay): Promise<NotificationJob> {
    const { delay = 0, ...step } = stepWithDelay;
    if (!step.template) throw new ApiException('Step template was not found');
    const providerId: string | undefined = await this.getProviderId(
      parentJob._environmentId,
      parentJob._organizationId,
      parentJob._userId,
      step.template.type
    );

    return {
      identifier: parentJob.identifier,
      overrides: parentJob.overrides,
      _userId: parentJob._userId,
      transactionId: parentJob.transactionId,
      payload: parentJob.payload,
      _notificationId: parentJob._notificationId,
      _environmentId: parentJob._environmentId,
      _organizationId: parentJob._organizationId,
      _subscriberId: parentJob._subscriberId,
      status: JobStatusEnum.PENDING,
      _templateId: parentJob._templateId,
      providerId,
      step,
      digest: step.metadata,
      digestedNotificationIds: parentJob.digestedNotificationIds,
      type: step.template?.type,
      delay: delay,
      ...(parentJob._actorId && { _actorId: parentJob._actorId }),
    };
  }

  //for now keep it here
  public async getProviderId(
    environmentId: string,
    organizationId: string,
    userId: string,
    stepType: StepTypeEnum
  ): Promise<string | undefined> {
    const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(stepType);
    if (!channelType) return;
    const integrations = await this.getDecryptedIntegrations.execute(
      GetDecryptedIntegrationsCommand.create({ channelType, active: true, organizationId, environmentId, userId })
    );
    const integration = integrations[0];

    return integration?.providerId ?? InAppProviderIdEnum.Novu;
  }

  @Cached(CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE)
  public async getNotificationTemplate(environmentId: string, identifier: string) {
    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(environmentId, identifier);
    if (!template) throw new ApiException(`Template not found for identifier ${identifier}`);

    return template;
  }
}
