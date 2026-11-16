import { Injectable, Optional } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { MetricsService } from '../../metrics/metrics.service';
import { mapJobToStepRunV2 } from './step-run-v2.mapper';
import { StepRunV2Repository } from './step-run-v2.repository';
import { StepRunV2Row } from './step-run-v2.schema';

export const STEP_RUNS_V2_INSERT_ERROR_METRIC = 'step_runs_v2.insert_error';
export const STEP_RUNS_V2_DROPPED_METRIC = 'step_runs_v2.dropped';

/** Rows accepted but not yet inserted; beyond this, new rows are dropped rather than queued in memory. */
export const STEP_RUNS_V2_MAX_PENDING_ROWS = 10_000;

const REREAD_JOB_PROJECTION =
  '_id _environmentId _organizationId _notificationId type status providerId step._id step.stepId step.name ' +
  'step.template.type step.metadata digest scheduleExtensionsCount waitUntil createdAt updatedAt';

export type WriteStepRunsV2ByIdsParams = {
  environmentId: string;
  organizationId: string;
  jobIds: string[];
};

/**
 * Writes jobs to step_runs_v2 exactly as Mongo holds them after a status change: pass the post-update document,
 * or use writeByIds after bulk updates that return none. Callers never wait: every method returns immediately
 * and never throws, so ClickHouse latency or failures cannot delay job processing. Rows are built when a method
 * is called, so later in-memory changes to the job (e.g. step template hydration) never reach them.
 */
@Injectable()
export class StepRunV2Writer {
  private pendingRows = 0;

  constructor(
    private readonly stepRunV2Repository: StepRunV2Repository,
    private readonly jobRepository: JobRepository,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger,
    @Optional() private readonly metricsService?: MetricsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  write(job: JobEntity | null | undefined): void {
    if (!job) {
      return;
    }

    this.writeMany([job]);
  }

  writeMany(jobs: (JobEntity | null | undefined)[]): void {
    if (!this.stepRunV2Repository.isConfigured()) {
      return;
    }

    const jobsByEnvironment = new Map<string, { organizationId: string; jobIds: string[]; rows: StepRunV2Row[] }>();

    for (const job of jobs) {
      if (!job) {
        continue;
      }

      const row = this.mapJob(job);
      if (!row) {
        continue;
      }

      const environmentId = String(job._environmentId);
      const environmentJobs = jobsByEnvironment.get(environmentId) ?? {
        organizationId: String(job._organizationId),
        jobIds: [],
        rows: [],
      };
      environmentJobs.jobIds.push(String(job._id));
      environmentJobs.rows.push(row);
      jobsByEnvironment.set(environmentId, environmentJobs);
    }

    for (const [environmentId, { organizationId, jobIds, rows }] of jobsByEnvironment) {
      this.runInBackground(jobIds, environmentId, organizationId, async () => rows);
    }
  }

  /**
   * Re-reads the jobs and writes their current state. For bulk updates that do not return the updated documents.
   */
  writeByIds({ environmentId, organizationId, jobIds }: WriteStepRunsV2ByIdsParams): void {
    if (!this.stepRunV2Repository.isConfigured() || jobIds.length === 0) {
      return;
    }

    this.runInBackground(jobIds.map(String), String(environmentId), String(organizationId), async () => {
      const reread = await this.jobRepository.find(
        { _environmentId: environmentId, _id: { $in: jobIds } },
        REREAD_JOB_PROJECTION
      );

      return reread.map((job) => mapJobToStepRunV2(job));
    });
  }

  /** Never throws: a job that cannot be mapped is logged and skipped. */
  private mapJob(job: JobEntity): StepRunV2Row | undefined {
    try {
      return mapJobToStepRunV2(job);
    } catch (error) {
      this.metricsService?.recordMetric(STEP_RUNS_V2_INSERT_ERROR_METRIC, 1);
      this.logger.error({ err: error, stepRunId: String(job._id) }, 'Failed to map job to a step_runs_v2 row');

      return undefined;
    }
  }

  private runInBackground(
    stepRunIds: string[],
    environmentId: string,
    organizationId: string,
    loadRows: () => Promise<StepRunV2Row[]>
  ): void {
    if (this.pendingRows + stepRunIds.length > STEP_RUNS_V2_MAX_PENDING_ROWS) {
      this.metricsService?.recordMetric(STEP_RUNS_V2_DROPPED_METRIC, stepRunIds.length);
      this.logger.warn(
        { droppedRows: stepRunIds.length, pendingRows: this.pendingRows },
        'Dropping step_runs_v2 rows: too many pending writes'
      );

      return;
    }

    this.pendingRows += stepRunIds.length;

    void this.writeEnvironmentRows(stepRunIds, environmentId, organizationId, loadRows).finally(() => {
      this.pendingRows -= stepRunIds.length;
    });
  }

  private async writeEnvironmentRows(
    stepRunIds: string[],
    environmentId: string,
    organizationId: string,
    loadRows: () => Promise<StepRunV2Row[]>
  ): Promise<void> {
    try {
      const isEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUNS_V2_WRITE_ENABLED,
        organization: { _id: organizationId },
        environment: { _id: environmentId },
        defaultValue: false,
      });

      if (!isEnabled) {
        return;
      }

      await this.stepRunV2Repository.insertMany(await loadRows());
    } catch (error) {
      this.metricsService?.recordMetric(STEP_RUNS_V2_INSERT_ERROR_METRIC, 1);
      this.logger.error({ err: error, stepRunIds }, 'Failed to write step_runs_v2 rows');
    }
  }
}
