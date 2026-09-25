import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ActiveJobsMetricQueueService,
  ActiveJobsMetricWorkerService,
  MetricsService,
  QueueBaseService,
  WorkerOptions,
} from '@novu/application-generic';
import { CronExpressionEnum } from '@novu/shared';

const nr = require('newrelic');

const LOG_CONTEXT = 'ActiveJobMetricService';
const METRIC_JOB_ID = 'metrics-job';

@Injectable()
export class ActiveJobsMetricService {
  constructor(
    @Inject('BULLMQ_LIST') private tokenList: QueueBaseService[],
    public readonly activeJobsMetricQueueService: ActiveJobsMetricQueueService,
    public readonly activeJobsMetricWorkerService: ActiveJobsMetricWorkerService,
    private metricsService: MetricsService
  ) {
    const hasMetricsBackend =
      (process.env.NOVU_MANAGED_SERVICE === 'true' && !!process.env.NEW_RELIC_LICENSE_KEY) ||
      process.env.ENABLE_OTEL === 'true';

    if (hasMetricsBackend) {
      this.activeJobsMetricWorkerService.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());

      this.activeJobsMetricWorkerService.bullMqWorker?.on('failed', async (job, error) => {
        Logger.error(error, 'Metric Completed Job failed', LOG_CONTEXT);
      });
    }

    void this.reconcileRepeatableMetricJob(hasMetricsBackend);
  }

  /**
   * Keeps the repeatable entry in step with whether this deployment can consume
   * it. Without a metrics backend no worker is created, so an entry left over
   * from a previous configuration would repeat forever with nobody reading it.
   */
  private async reconcileRepeatableMetricJob(hasMetricsBackend: boolean): Promise<void> {
    try {
      const repeatables = await this.activeJobsMetricQueueService.queue.getRepeatableJobs();
      const existing = repeatables.find((repeatable) => repeatable.id === METRIC_JOB_ID);

      if (!hasMetricsBackend) {
        if (existing) {
          await this.activeJobsMetricQueueService.queue.removeRepeatableByKey(existing.key);
        }

        return;
      }

      if (existing) {
        return;
      }

      await this.activeJobsMetricQueueService.add({
        name: METRIC_JOB_ID,
        data: undefined,
        groupId: '',
        options: {
          jobId: METRIC_JOB_ID,
          repeatJobKey: METRIC_JOB_ID,
          repeat: {
            immediately: true,
            pattern: CronExpressionEnum.EVERY_30_SECONDS,
          },
          removeOnFail: true,
          removeOnComplete: true,
          attempts: 1,
        },
      });
    } catch (error) {
      nr.noticeError(error);

      Logger.error(error, 'Failed to reconcile the repeatable metric job', LOG_CONTEXT);
    }
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 900,
      concurrency: 1,
      settings: {},
    };
  }

  private getWorkerProcessor() {
    return async () => {
      Logger.debug('metric job started', LOG_CONTEXT);
      const deploymentName = process.env.FLEET_NAME ?? 'default';
      let fatalError: unknown;

      for (const queueService of this.tokenList) {
        try {
          const waitCount = queueService.getGroupsJobsCount
            ? await queueService.getGroupsJobsCount()
            : await queueService.getWaitingCount();
          const delayedCount = await queueService.getDelayedCount();
          const activeCount = await queueService.getActiveCount();

          this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/waiting`, waitCount);
          this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/delayed`, delayedCount);
          this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/active`, activeCount);
        } catch (error) {
          Logger.error(error, `Failed to collect metrics for queue: ${queueService.topic}`, LOG_CONTEXT);
          fatalError = error;
        }
      }

      if (fatalError) {
        throw fatalError;
      }
    };
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Active Jobs Metric service down', LOG_CONTEXT);

    if (this.activeJobsMetricQueueService) {
      await this.activeJobsMetricQueueService.gracefulShutdown();
    }
    if (this.activeJobsMetricWorkerService) {
      await this.activeJobsMetricWorkerService.gracefulShutdown();
    }

    Logger.log('Shutting down the Active Jobs Metric service has finished', LOG_CONTEXT);
  }
}
