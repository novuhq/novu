const nr = require('newrelic');
import { Logger } from '@nestjs/common';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { MetricsService } from '../metrics';
import {
  CronJobData,
  CronJobProcessor,
  CronMetrics,
  CronOptions,
} from './cron.types';

const LOG_CONTEXT = 'CronService';
const DEFAULT_CRON_OPTIONS: CronOptions = {
  lockLimit: 1,
  lockLifetime: 10000,
  priority: 0,
  concurrency: 1,
  timezone: 'Etc/UTC',
};

const METRICS_CRON_INTERVAL = '*/10 * * * * *'; // every 10 seconds
const METRICS_JOB_NAME = 'send-cron-metrics';
const METRICS_JOB_CONCURRENCY = 1;
const METRICS_JOB_LOCK_LIFETIME = 1 * 60 * 1000; // 1 minute

export abstract class CronService implements OnModuleInit, OnModuleDestroy {
  private deploymentName = process.env.FLEET_NAME ?? 'default';
  protected abstract cronServiceName: string;

  constructor(private metricsService: MetricsService) {}

  protected abstract addJob<TData = unknown>(
    jobName: string,
    processor: CronJobProcessor<TData>,
    interval: string,
    options: CronOptions
  ): Promise<void>;

  protected abstract removeJob(jobName: string): Promise<void>;

  protected abstract getMetrics(): Promise<CronMetrics>;

  protected abstract initialize(): Promise<void>;

  protected abstract shutdown(): Promise<void>;

  async onModuleInit() {
    Logger.log(
      `Starting the '${this.cronServiceName}' CRON service up`,
      LOG_CONTEXT
    );
    await this.initialize();
    await this.createSendCronMetricsJob();
    Logger.log(
      `Starting up the '${this.cronServiceName}' CRON service has finished`,
      LOG_CONTEXT
    );
  }
  async onModuleDestroy() {
    Logger.log(
      `Shutting the '${this.cronServiceName}' CRON service down`,
      LOG_CONTEXT
    );
    await this.shutdown();
    Logger.log(
      `Shutting down the '${this.cronServiceName}' CRON service has finished`,
      LOG_CONTEXT
    );
  }

  public async add<TData = unknown>(
    jobName: string,
    processor: (job: CronJobData<TData>) => Promise<void>,
    interval: string,
    options: CronOptions
  ): Promise<void> {
    const combinedOptions = {
      ...DEFAULT_CRON_OPTIONS,
      ...options,
    };
    this.handleJobOutcome(jobName, 'create-started');
    try {
      this.addJob(
        jobName,
        async (job) => {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const _this = this;

          nr.startBackgroundTransaction(
            ObservabilityBackgroundTransactionEnum.CRON_JOB_QUEUE,
            `cron-${jobName}`,
            function transactionHandler() {
              return new Promise<void>(async (resolve, reject) => {
                const transaction = nr.getTransaction();
                try {
                  _this.handleJobOutcome(jobName, 'started');
                  await processor({
                    name: jobName,
                    startedAt: job.startedAt,
                    data: job.data as TData,
                  });
                  _this.handleJobOutcome(jobName, 'completed');
                  resolve();
                } catch (error) {
                  _this.handleJobOutcome(jobName, 'failed', error);
                  reject(error);
                } finally {
                  transaction.end();
                }
              });
            }
          );
        },
        interval,
        {
          lockLifetime: combinedOptions.lockLifetime,
          lockLimit: combinedOptions.lockLimit,
          concurrency: combinedOptions.concurrency,
          priority: combinedOptions.priority,
        }
      );
      this.handleJobOutcome(jobName, 'create-completed');
    } catch (error) {
      this.handleJobOutcome(jobName, 'create-failed', error);
      throw error;
    }
  }

  public async remove(jobName: string) {
    this.handleJobOutcome(jobName, 'cancel-started');
    try {
      await this.remove(jobName);
      this.handleJobOutcome(jobName, 'cancel-completed');
    } catch (error) {
      this.handleJobOutcome(jobName, 'cancel-failed', error);
      throw error;
    }
  }

  private async createSendCronMetricsJob() {
    await this.add(
      METRICS_JOB_NAME,
      async () => {
        await this.sendCronMetrics();
      },
      METRICS_CRON_INTERVAL,
      {
        concurrency: METRICS_JOB_CONCURRENCY,
        lockLifetime: METRICS_JOB_LOCK_LIFETIME,
      }
    );
  }

  private async sendCronMetrics() {
    const metrics = await this.getMetrics();

    Object.entries(metrics).forEach(([jobName, jobMetrics]) => {
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/active`,
        jobMetrics.active
      );
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/waiting`,
        jobMetrics.waiting
      );
    });
  }

  private handleJobOutcome(jobName: string, outcome: string, error?: unknown) {
    const outcomeMessage = `Cron/${this.deploymentName}/${jobName}/${outcome}`;
    this.metricsService.recordMetric(outcomeMessage, 1);

    const eventName = this.kebabToSentenceCase(outcome);

    const logMessage = error
      ? `${eventName}: '${jobName}' job: ${JSON.stringify(error)}`
      : `${eventName}: '${jobName}' job`;

    if (error) {
      Logger.error(logMessage, LOG_CONTEXT);
    } else {
      Logger.verbose(logMessage, LOG_CONTEXT);
    }
  }

  private kebabToSentenceCase(kebabCaseString: string): string {
    return kebabCaseString
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
