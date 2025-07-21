import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { JobEntity, JobStatusEnum, MessageEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { format } from 'date-fns';
import { LogRepository, SchemaKeys } from '../log.repository';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { stepRunSchema, ORDER_BY, TABLE_NAME, StepRun, StepType } from './step-run.schema';
import { getInsertOptions } from '../shared';

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
  deferredMs?: number;
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
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, stepRunSchema, ORDER_BY, featureFlagsService);
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
      case StepTypeEnum.TRIGGER:
        return 'trigger';
      case StepTypeEnum.DELAY:
        return 'delay';
      case StepTypeEnum.CUSTOM:
        return 'custom';
      default:
        return null;
    }
  }

  async create(job: JobEntity, options: StepOptions = {}): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_WRITE_ENABLED,
        organization: { _id: job._organizationId },
        environment: { _id: job._environmentId },
        user: { _id: job._userId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      // Preserve existing deferredMs if not explicitly provided
      const existingDeferredMs = await this.getExistingDeferredMs(job._organizationId, job._id);
      const finalOptions = {
        ...options,
        deferredMs: options.deferredMs ?? existingDeferredMs,
      };

      const stepRunData = this.mapJobToStepRun(job, finalOptions);
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
        organization: { _id: firstJob._organizationId },
        environment: { _id: firstJob._environmentId },
        user: { _id: firstJob._userId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const stepRunDataArray: StepRunInsertData[] = [];

      for (const job of jobs) {
        // Preserve existing deferredMs if not explicitly provided
        const existingDeferredMs = await this.getExistingDeferredMs(job._organizationId, job._id);
        const finalOptions = {
          ...options,
          deferredMs: options.deferredMs ?? existingDeferredMs,
        };

        const stepRunData = this.mapJobToStepRun(job, finalOptions);
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

  private async getExistingDeferredMs(organizationId: string, stepRunId: string): Promise<number | null> {
    if (!this.clickhouseService.client) {
      return null;
    }

    try {
      const query = `
        SELECT deferred_ms 
        FROM ${this.table} 
        WHERE organization_id = {organizationId:String} 
          AND step_run_id = {stepRunId:String}
          AND deferred_ms IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const result = await this.clickhouseService.query({
        query,
        params: {
          organizationId,
          stepRunId,
        },
      });

      return (result.data?.[0] as { deferred_ms?: number })?.deferred_ms || null;
    } catch (error) {
      this.logger.warn({ err: error, stepRunId }, 'Failed to query existing deferredMs');

      return null;
    }
  }

  private mapJobToStepRun(job: JobEntity, options?: StepOptions): StepRunInsertData {
    const now = new Date();
    const createdAt = new Date(job.createdAt || now);

    return {
      created_at: this.formatDateTime64(createdAt),
      updated_at: this.formatDateTime64(now),

      // Core step run identification
      step_run_id: job._id,
      step_id: job.step._id || job.step.stepId || job._id,

      // Context
      organization_id: job._organizationId,
      environment_id: job._environmentId,
      user_id: job._userId,
      subscriber_id: job._subscriberId || job.subscriberId,
      external_subscriber_id: null, // Will be populated from subscriber if available
      message_id: options?.message?._id || null,

      // Step metadata
      step_type: this.mapStepTypeEnumToStepType(job.type || job.step.template?.type),
      step_name: job.step.template?.name || job.step.stepId || 'unnamed_step',
      provider_id: job.providerId || null,

      // Execution details
      status: options?.status || job.status,

      // Performance metrics
      deferred_ms: options?.deferredMs || null,

      // Error handling
      error_code: options?.errorCode || null,
      error_message: options?.errorMessage || null,

      // Correlation
      transaction_id: job.transactionId,
    };
  }

  private formatDateTime64(date: Date): Date {
    return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS") as unknown as Date;
  }
}
