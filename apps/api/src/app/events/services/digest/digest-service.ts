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
import { StepTypeEnum } from '@novu/shared';
import { get } from 'lodash';
import { constructActiveDAG, getBackoffDate, StepWithDelay } from '../../helpers/helpers';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { Cached } from '../../../shared/interceptors';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { NotificationJob, prepareJob, prepareChildJob } from '../../helpers/job_preparation';

import { v5 as uuidv5 } from 'uuid';

@Injectable()
export class DigestService {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository
  ) {}

  //Returns digest job only when it is created, other cases returns undefined
  public async createOrUpdateDigestJob(command: any, notification: NotificationEntity, steps: StepWithDelay[]) {
    let digestJob = await this.findOneAndUpdateDigest(notification, steps[0]);
    if (!digestJob || digestJob.digestedNotificationIds?.[0] !== notification._id) return; //old
    const preparedJob = await prepareJob(command, notification, steps[0]);
    preparedJob.status = JobStatusEnum.QUEUED;
    //Can avoid this additional update by using setOnInsert, but need to send huge data on every call to DB.
    digestJob = await this.jobRepository.findOneAndUpdate(
      { _id: digestJob._id, _environmentId: notification._environmentId },
      { ...preparedJob },
      { new: true }
    );

    return digestJob;
  }
  private async findOneAndUpdate(notification: NotificationEntity, digestRunKey, upsert = false) {
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
    const digestRunKey = this.createDigestRunKey(notification, step._templateId, step.metadata?.digestKey);
    try {
      return await this.findOneAndUpdate(notification, digestRunKey, true);
    } catch (error) {
      if (error.message.includes('duplicate key')) return await this.findOneAndUpdate(notification, digestRunKey);
      else throw new ApiException(error);
    }
  }

  private createDigestRunKey(notification: NotificationEntity, stepTemplateId, digestKey) {
    const { _environmentId, _subscriberId, _templateId, payload } = notification;
    let plainKey = `${_environmentId}${_subscriberId}${_templateId}${stepTemplateId}`;
    if (digestKey) plainKey += digestKey + get(payload, digestKey);

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
      jobs.push(await prepareChildJob(digestJob, step));
    }
    jobs[0]._parentId = digestJob._id;

    return await this.jobRepository.storeJobs(jobs);
  }

  @Cached(CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE)
  public async getNotificationTemplate(environmentId: string, identifier: string) {
    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(environmentId, identifier);
    if (!template) throw new ApiException(`Template not found for identifier ${identifier}`);

    return template;
  }
}
