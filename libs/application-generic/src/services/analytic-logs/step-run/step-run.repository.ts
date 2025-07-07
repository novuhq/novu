import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { JobEntity, JobStatusEnum, MessageEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { addYears, format } from 'date-fns';
import { BaseRepository, SchemaKeys } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { stepRunSchema, ORDER_BY, TABLE_NAME, StepRun } from './step-run.schema';

type StepRunInsertData = Omit<StepRun, 'id'>;

type StepOptions = {
  status?: JobStatusEnum;
  message?: MessageEntity;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
};

@Injectable()
export class StepRunRepository extends BaseRepository<typeof stepRunSchema> {
  public readonly table = TABLE_NAME;
  public readonly schema = stepRunSchema;
  public readonly schemaOrderBy: SchemaKeys<typeof stepRunSchema>[] = ORDER_BY;
  public readonly identifierPrefix = 'sr_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    private readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger);
    this.logger.setContext(this.constructor.name);
  }

  async create(job: JobEntity, options: StepOptions = {}): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_ENABLED,
        organization: { _id: job._organizationId },
        environment: { _id: job._environmentId },
        user: { _id: job._userId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const stepRunData = this.mapJobToStepRun(job, options);
      await this.insert(stepRunData);

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
      this.logger.error({ error, jobId: job._id, status: job.status }, `Failed to log step ${job.status}`);
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
      step_type: job.type || job.step.template?.type || 'unknown',
      step_name: job.step.template?.name || job.step.stepId || 'unnamed_step',
      provider_id: job.providerId || null,

      // Execution details
      status: options?.status || job.status,

      // Performance metrics
      duration_ms: options?.duration || null,
      deferred_ms: job.delay ? parseInt(job.delay.toString(), 10) : null,

      // Error handling
      error_code: options?.errorCode || null,
      error_message: options?.errorMessage || null,

      // Correlation
      transaction_id: job.transactionId,

      /*
       * Data retention
       * todo remove this should be maintained in base repository, its already implemented in another pr
       */
      expires_at: this.formatDateTime64(addYears(now, 1)),
    };
  }

  private formatDateTime64(date: Date): Date {
    return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS") as unknown as Date;
  }
}
