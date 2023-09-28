import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, IDelayOrDigestJobResult } from '@novu/dal';
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
import { DigestFilterSteps } from '../digest-filter-steps';
import {
  DetailEnum,
  CreateExecutionDetailsCommand,
  CreateExecutionDetails,
} from '../create-execution-details';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

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
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: MergeOrCreateDigestCommand
  ): Promise<MergeOrCreateDigestResultType> {
    const { job } = command;

    const digestMeta = job.digest as IDigestBaseMetadata | undefined;
    const digestKey = digestMeta?.digestKey;
    const digestValue = DigestFilterSteps.getNestedValue(
      job.payload,
      digestKey
    );

    const digestAction = await this.shouldDelayDigestOrMergeWithLock(
      job,
      digestKey,
      digestValue,
      digestMeta
    );

    switch (digestAction.digestResult) {
      case DigestCreationResultEnum.MERGED:
        return await this.processMergedDigest(job, digestAction.activeDigestId);
      case DigestCreationResultEnum.SKIPPED:
        return await this.processSkippedDigest(job);
      case DigestCreationResultEnum.CREATED:
        return await this.processCreatedDigest(digestMeta, job);
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
    activeDigestId: string
  ): Promise<DigestCreationResultEnum> {
    await this.jobRepository.update(
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
    );

    await this.jobRepository.updateAllChildJobStatus(
      job,
      JobStatusEnum.MERGED,
      activeDigestId
    );

    await this.digestMergedExecutionDetails(job);

    return DigestCreationResultEnum.MERGED;
  }

  @Instrument()
  private async processSkippedDigest(
    job: JobEntity
  ): Promise<DigestCreationResultEnum> {
    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        _id: job._id,
      },
      {
        $set: {
          status: JobStatusEnum.SKIPPED,
        },
      }
    );

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
}
