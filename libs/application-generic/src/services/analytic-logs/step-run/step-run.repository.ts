import { Injectable, Optional } from '@nestjs/common';
import { JobEntity, JobStatusEnum, MessageEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { StepType } from '..';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { ClickHouseBatchService } from '../clickhouse-batch.service';
import { LogRepository, SchemaKeys } from '../log.repository';
import { getInsertOptions } from '../shared';
import { ORDER_BY, StepRun, stepRunSchema, TABLE_NAME } from './step-run.schema';

type StepRunInsertData = Omit<StepRun, 'id' | 'expires_at'>;

const STEP_RUN_INSERT_OPTIONS: InsertOptions = getInsertOptions(
  process.env.STEP_RUNS_ASYNC_INSERT,
  process.env.STEP_RUNS_WAIT_ASYNC_INSERT
);

type StepOptions = {
  status?: JobStatusEnum;
  message?: MessageEntity;
  errorCode?: string;
  errorMessage?: string;
};

@Injectable()
export class StepRunRepository extends LogRepository<typeof stepRunSchema, StepRun> {
  public readonly table = TABLE_NAME;
  public readonly schema = stepRunSchema;
  public readonly schemaOrderBy: SchemaKeys<typeof stepRunSchema>[] = ORDER_BY;
  public readonly identifierPrefix = 'sr_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService,
    @Optional() protected readonly batchService?: ClickHouseBatchService
  ) {
    super(clickhouseService, logger, stepRunSchema, ORDER_BY, featureFlagsService, batchService);
    this.logger.setContext(this.constructor.name);
  }

  private mapStepTypeEnumToStepType(stepType: StepTypeEnum | undefined): StepType | null {
    switch (stepType) {
      case StepTypeEnum.EMAIL:
        return 'email';
      case StepTypeEnum.SMS:
        return 'sms';
      case StepTypeEnum.IN_APP:
        return 'in_app';
      case StepTypeEnum.PUSH:
        return 'push';
      case StepTypeEnum.CHAT:
        return 'chat';
      case StepTypeEnum.DIGEST:
        return 'digest';
      case StepTypeEnum.THROTTLE:
        return 'throttle';
      case StepTypeEnum.TRIGGER:
        return 'trigger';
      case StepTypeEnum.DELAY:
        return 'delay';
      case StepTypeEnum.CUSTOM:
        return 'custom';
      case StepTypeEnum.HTTP_REQUEST:
        return 'http_request';
      default:
        return null;
    }
  }

  async create(job: JobEntity, options: StepOptions = {}): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: String(job._organizationId) },
        environment: { _id: String(job._environmentId) },
        user: { _id: String(job._userId) },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const stepRunData = this.mapJobToStepRun(job, options);
      await super.insert(
        stepRunData,
        {
          organizationId: job._organizationId,
          environmentId: job._environmentId,
          userId: job._userId,
        },
        STEP_RUN_INSERT_OPTIONS
      );

      this.logger.debug(
        {
          stepRunId: job._id,
          status: job.status,
          ...(options.errorCode && { errorCode: options.errorCode }),
          ...(options.errorMessage && { errorMessage: options.errorMessage }),
        },
        `Step run ${job.status}`
      );
    } catch (error) {
      this.logger.error({ err: error, jobId: job._id, status: job.status }, `Failed to log step ${job.status}`);
    }
  }

  async createMany(jobs: JobEntity[], options: StepOptions = {}): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    try {
      const firstJob = jobs[0];
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: String(firstJob._organizationId) },
        environment: { _id: String(firstJob._environmentId) },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const stepRunDataArray: StepRunInsertData[] = [];

      for (const job of jobs) {
        const stepRunData = this.mapJobToStepRun(job, options);
        stepRunDataArray.push(stepRunData);
      }

      await super.insertMany(
        stepRunDataArray,
        {
          organizationId: firstJob._organizationId,
          environmentId: firstJob._environmentId,
          userId: firstJob._userId,
        },
        STEP_RUN_INSERT_OPTIONS
      );

      this.logger.debug(
        {
          count: jobs.length,
          stepRunIds: jobs.map((job) => job._id),
          status: options.status,
          ...(options.errorCode && { errorCode: options.errorCode }),
          ...(options.errorMessage && { errorMessage: options.errorMessage }),
        },
        `Step runs ${options.status || 'processed'} in batch`
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          jobIds: jobs.map((job) => job._id),
          status: options.status,
        },
        `Failed to log step runs ${options.status || 'processing'} in batch`
      );
    }
  }

  private mapJobToStepRun(job: JobEntity, options?: StepOptions): StepRunInsertData {
    const now = new Date();
    const stepType = this.mapStepTypeEnumToStepType(job.type || job.step.template?.type);

    return {
      created_at: LogRepository.formatDateTime64(new Date(job.createdAt)),
      updated_at: LogRepository.formatDateTime64(now),

      // Core step run identification
      step_run_id: job._id,
      step_id: job.step._id || job.step.stepId || job._id,
      workflow_run_id: job._notificationId,
      workflow_id: job._templateId,

      // Context
      organization_id: job._organizationId,
      environment_id: job._environmentId,
      user_id: job._userId,
      subscriber_id: job._subscriberId,
      external_subscriber_id: job.subscriberId,
      message_id: options?.message?._id || null,
      context_keys: job.contextKeys || [],

      // Step metadata
      step_type: stepType,
      step_name: null, // todo remove this parameter because we do not have step name at this stage.
      provider_id: job.providerId || null,

      // Execution details
      status: options?.status || job.status,

      // Digest data
      digest: job.digest ? JSON.stringify(job.digest) : null,

      // Error handling
      error_code: options?.errorCode || null,
      error_message: options?.errorMessage || null,

      // Correlation
      transaction_id: job.transactionId,

      // Schedule extensions count
      schedule_extensions_count: job?.scheduleExtensionsCount || 0,

      deferred_ms: null,
    };
  }
}
