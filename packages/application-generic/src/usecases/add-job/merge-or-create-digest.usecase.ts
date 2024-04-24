import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  JobEntity,
  JobRepository,
  IDelayOrDigestJobResult,
  NotificationRepository,
} from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  JobStatusEnum,
  DigestCreationResultEnum,
} from '@novu/shared';

import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { ApiException } from '../../utils/exceptions';
import { EventsDistributedLockService } from '../../services';
import { DetailEnum } from '../create-execution-details';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { getNestedValue } from '../../utils/object';
import {
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '../execution-log-route';

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
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute,
    private notificationRepository: NotificationRepository
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: MergeOrCreateDigestCommand
  ): Promise<MergeOrCreateDigestResultType> {
    const { job } = command;

    const digestMeta =
      command.chimeraData ?? (job.digest as IDigestBaseMetadata | undefined);
    const digestKey = command.chimeraData?.digestKey ?? digestMeta?.digestKey;
    const digestValue = getNestedValue(job.payload, digestKey);

    const digestAction = command.filtered
      ? { digestResult: DigestCreationResultEnum.SKIPPED }
      : await this.shouldDelayDigestOrMergeWithLock(
          job,
          digestKey,
          digestValue,
          digestMeta
        );

    switch (digestAction.digestResult) {
      case DigestCreationResultEnum.MERGED:
        return await this.processMergedDigest(
          job,
          digestAction.activeDigestId,
          digestAction.activeNotificationId
        );
      case DigestCreationResultEnum.SKIPPED:
        return await this.processSkippedDigest(job, command.filtered);
      case DigestCreationResultEnum.CREATED:
        return await this.processCreatedDigest(
          digestMeta as IDigestBaseMetadata,
          job
        );
      default:
        throw new ApiException('Something went wrong with digest creation');
    }
  }

  @Instrument()
  private async processCreatedDigest(
    digestMeta: IDigestBaseMetadata | undefined,
    job: JobEntity
  ): Promise<DigestCreationResultEnum> {
    const regularDigestMeta = digestMeta as IDigestRegularMetadata | undefined;
    if (!regularDigestMeta?.amount || !regularDigestMeta?.unit) {
      throw new ApiException(
        `Somehow ${job._id} had wrong digest settings and escaped validation`
      );
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
      this.jobRepository.updateAllChildJobStatus(
        job,
        JobStatusEnum.MERGED,
        activeDigestId
      ),
      this.digestMergedExecutionDetails(job),
      this.notificationRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._notificationId,
        },
        {
          $set: {
            _digestedNotificationId: activeNotificationId,
            expireAt: job.expireAt,
          },
        }
      ),
    ]);

    return DigestCreationResultEnum.MERGED;
  }

  @Instrument()
  private async processSkippedDigest(
    job: JobEntity,
    filtered = false
  ): Promise<DigestCreationResultEnum> {
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

  private getLockKey(
    job: JobEntity,
    digestKey: string,
    digestValue: string | number
  ): string {
    let resource = `environment:${job._environmentId}:template:${job._templateId}:subscriber:${job._subscriberId}`;
    if (digestKey && digestValue) {
      resource = `${resource}:digestKey:${digestKey}:digestValue:${digestValue}`;
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
      this.jobRepository.shouldDelayDigestJobOrMerge(
        job,
        digestKey,
        digestValue,
        digestMeta
      );

    const result =
      await this.eventsDistributedLockService.applyLock<IDelayOrDigestJobResult>(
        {
          resource: resourceKey,
          ttl: TTL,
        },
        shouldDelayDigestJobOrMerge
      );

    return result;
  }

  private async digestMergedExecutionDetails(job: JobEntity): Promise<void> {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: DetailEnum.DIGEST_MERGED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
  private async digestSkippedExecutionDetails(
    job: JobEntity,
    filtered: boolean
  ): Promise<void> {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: filtered ? DetailEnum.FILTER_STEPS : DetailEnum.DIGEST_SKIPPED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
}
