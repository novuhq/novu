import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IDelayOrDigestJobResult, JobEntity, JobRepository, NotificationRepository } from '@novu/dal';
import {
  DigestCreationResultEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  JobStatusEnum,
} from '@novu/shared';
import {
  ApiException,
  DetailEnum,
  EventsDistributedLockService,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  getNestedValue,
  Instrument,
  InstrumentUsecase,
} from '@novu/application-generic';

import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';

interface IFindAndUpdateResponse {
  matched: number;
  modified: number;
  execute: boolean;
}

type MergeOrCreateDigestResultType = DigestCreationResultEnum;

@Injectable()
export class MergeOrCreateDigest {
  constructor(
    @Inject(forwardRef(() => EventsDistributedLockService))
    private eventsDistributedLockService: EventsDistributedLockService,
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CreateExecutionDetails))
    private createExecutionDetails: CreateExecutionDetails,
    private notificationRepository: NotificationRepository
  ) {}

  @InstrumentUsecase()
  public async execute(command: MergeOrCreateDigestCommand): Promise<MergeOrCreateDigestResultType> {
    const { job } = command;

    const digestMeta = job.digest as IDigestBaseMetadata;
    const digestKey = digestMeta?.digestKey;
    const digestValue = digestMeta?.digestValue ?? getNestedValue(job.payload, digestKey);

    const digestAction = command.filtered
      ? { digestResult: DigestCreationResultEnum.SKIPPED }
      : await this.shouldDelayDigestOrMergeWithLock(job, digestKey, digestValue, digestMeta);

    switch (digestAction.digestResult) {
      case DigestCreationResultEnum.MERGED: {
        if (!digestAction.activeDigestId || !digestAction.activeNotificationId) {
          throw new ApiException(
            `Active digest or notification id is missing, active digest id ${digestAction.activeDigestId},` +
              `active notification id ${digestAction.activeNotificationId}`
          );
        }

        return await this.processMergedDigest(job, digestAction.activeDigestId, digestAction.activeNotificationId);
      }
      case DigestCreationResultEnum.SKIPPED:
        return await this.processSkippedDigest(job, command.filtered);
      case DigestCreationResultEnum.CREATED:
        return await this.processCreatedDigest(digestMeta as IDigestBaseMetadata, job);
      default:
        throw new ApiException('Something went wrong with digest creation');
    }
  }

  @Instrument()
  private async processCreatedDigest(
    digestMeta: IDigestBaseMetadata | undefined,
    job: JobEntity
  ): Promise<DigestCreationResultEnum> {
    if ((digestMeta as unknown as IDigestTimedMetadata)?.timed?.cronExpression) {
      return DigestCreationResultEnum.CREATED;
    }

    const regularDigestMeta = digestMeta as IDigestRegularMetadata | undefined;
    if (!regularDigestMeta?.amount || !regularDigestMeta?.unit) {
      const err = new Error();
      const { stack } = err;
      throw new ApiException(`Somehow ${job._id} had wrong digest settings and escaped validation`);
    }

    return DigestCreationResultEnum.CREATED;
  }

  @Instrument()
  private async processMergedDigest(
    job: JobEntity,
    activeDigestId: string,
    activeNotificationId: string
  ): Promise<DigestCreationResultEnum> {
    await Promise.all([
      this.jobRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._id,
        },
        {
          $set: {
            status: JobStatusEnum.MERGED,
            _mergedDigestId: activeDigestId,
          },
        }
      ),
      this.jobRepository.updateAllChildJobStatus(job, JobStatusEnum.MERGED, activeDigestId),
      this.digestMergedExecutionDetails(job),
      this.notificationRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._notificationId,
        },
        {
          $set: {
            _digestedNotificationId: activeNotificationId,
          },
        }
      ),
    ]);

    return DigestCreationResultEnum.MERGED;
  }

  @Instrument()
  private async processSkippedDigest(job: JobEntity, filtered = false): Promise<DigestCreationResultEnum> {
    await Promise.all([
      this.jobRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._id,
        },
        {
          $set: {
            status: JobStatusEnum.SKIPPED,
          },
        }
      ),
      this.digestSkippedExecutionDetails(job, filtered),
    ]);

    return DigestCreationResultEnum.SKIPPED;
  }

  private getLockKey(job: JobEntity, digestKey: string | undefined, digestValue: string | number | undefined): string {
    const resource = `environment:${job._environmentId}:template:${job._templateId}:subscriber:${job._subscriberId}`;
    if (digestKey && digestValue) {
      return `${resource}:digestKey:${digestKey}:digestValue:${digestValue}`;
    }

    if (digestValue) {
      return `${resource}:digestValue:${digestValue}`;
    }

    return resource;
  }

  private async shouldDelayDigestOrMergeWithLock(
    job: JobEntity,
    digestKey?: string,
    digestValue?: string | number,
    digestMeta?: any
  ): Promise<IDelayOrDigestJobResult> {
    const TTL = 1500;
    const resourceKey = this.getLockKey(job, digestKey, digestValue);

    const shouldDelayDigestJobOrMerge = async () =>
      this.jobRepository.shouldDelayDigestJobOrMerge(job, digestKey, digestValue, digestMeta);

    const result = await this.eventsDistributedLockService.applyLock<IDelayOrDigestJobResult>(
      {
        resource: resourceKey,
        ttl: TTL,
      },
      shouldDelayDigestJobOrMerge
    );

    return result;
  }

  private async digestMergedExecutionDetails(job: JobEntity): Promise<void> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.DIGEST_MERGED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
  private async digestSkippedExecutionDetails(job: JobEntity, filtered: boolean): Promise<void> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: filtered ? DetailEnum.FILTER_STEPS : DetailEnum.DIGEST_SKIPPED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
}
