import { Injectable, Optional } from '@nestjs/common';
import { JobEntity, JobStatusEnum } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { MetricsService } from '../../metrics/metrics.service';
import { mapJobToStepRunV2 } from './step-run-v2.mapper';
import { StepRunV2Repository } from './step-run-v2.repository';

export const STEP_RUNS_V2_INSERT_ERROR_METRIC = 'step_runs_v2.insert_error';

export type StepRunV2WriteOptions = {
  /** Status Mongo holds after the change. Defaults to the job's own status. */
  status?: JobStatusEnum;
  waitUntil?: Date;
  digestEventsCount?: number;
};

/**
 * Writes the post-update job status to step_runs_v2. Callers never wait: write() and writeMany()
 * return immediately and never throw, so ClickHouse latency or failures cannot delay job processing.
 */
@Injectable()
export class StepRunV2Writer {
  constructor(
    private readonly stepRunV2Repository: StepRunV2Repository,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger,
    @Optional() private readonly metricsService?: MetricsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  write(job: JobEntity | null | undefined, options: StepRunV2WriteOptions = {}): void {
    if (!job) {
      return;
    }

    this.writeMany([job], options);
  }

  writeMany(jobs: (JobEntity | null | undefined)[], options: StepRunV2WriteOptions = {}): void {
    if (!this.stepRunV2Repository.isConfigured()) {
      return;
    }

    const updatedAt = new Date();
    const presentJobs = jobs.filter((job): job is JobEntity => Boolean(job));

    if (presentJobs.length === 0) {
      return;
    }

    void this.writeJobs(presentJobs, options, updatedAt);
  }

  private async writeJobs(jobs: JobEntity[], options: StepRunV2WriteOptions, updatedAt: Date): Promise<void> {
    const jobsByEnvironment = new Map<string, JobEntity[]>();

    for (const job of jobs) {
      const environmentId = String(job._environmentId);
      const environmentJobs = jobsByEnvironment.get(environmentId) ?? [];
      environmentJobs.push(job);
      jobsByEnvironment.set(environmentId, environmentJobs);
    }

    await Promise.all(
      Array.from(jobsByEnvironment.values()).map((environmentJobs) =>
        this.writeEnvironmentJobs(environmentJobs, options, updatedAt)
      )
    );
  }

  private async writeEnvironmentJobs(
    jobs: JobEntity[],
    options: StepRunV2WriteOptions,
    updatedAt: Date
  ): Promise<void> {
    const stepRunIds = jobs.map((job) => String(job._id));

    try {
      const firstJob = jobs[0];
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUNS_V2_WRITE_ENABLED,
        organization: { _id: String(firstJob._organizationId) },
        environment: { _id: String(firstJob._environmentId) },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      const rows = jobs.map((job) =>
        mapJobToStepRunV2(job, {
          status: options.status ?? job.status,
          updatedAt,
          waitUntil: options.waitUntil,
          digestEventsCount: options.digestEventsCount,
        })
      );

      await this.stepRunV2Repository.insertMany(rows);
    } catch (error) {
      this.metricsService?.recordMetric(STEP_RUNS_V2_INSERT_ERROR_METRIC, 1);
      this.logger.error(
        { err: error, stepRunIds, status: options.status ?? jobs[0]?.status },
        'Failed to write step_runs_v2 rows'
      );
    }
  }
}
