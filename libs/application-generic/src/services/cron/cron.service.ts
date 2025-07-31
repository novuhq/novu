import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  CronExpressionEnum,
  JobCronNameEnum,
  ObservabilityBackgroundTransactionEnum,
  TimezoneEnum,
} from '@novu/shared';
import { captureException } from '@sentry/node';
import { MetricsService } from '../metrics';
import { CronJobData, CronJobProcessor, CronMetrics, CronMetricsEventEnum, CronOptions } from './cron.types';

const nr = require('newrelic');

const LOG_CONTEXT = 'CronService';
const DEFAULT_CRON_OPTIONS: CronOptions = {
  lockLimit: 1,
  lockLifetime: 10000,
  priority: 0,
  concurrency: 1,
  timezone: TimezoneEnum.ETC_UTC,
};
const CRON_STARTUP_TIMEOUT = 2000; // 2 seconds in milliseconds
const CRON_STARTUP_RETRIES = 3;

const METRICS_CRON_INTERVAL = CronExpressionEnum.EVERY_10_SECONDS;
const METRICS_JOB_NAME = JobCronNameEnum.SEND_CRON_METRICS;
const METRICS_JOB_CONCURRENCY = 1;
const METRICS_JOB_LOCK_LIFETIME = 1 * 60 * 1000; // 1 minute in milliseconds

@Injectable()
export abstract class CronService implements OnApplicationBootstrap, OnApplicationShutdown {
  private deploymentName = process.env.FLEET_NAME ?? 'default';
  protected abstract cronServiceName: string;

  constructor(
    private metricsService: MetricsService,
    private activeJobs: JobCronNameEnum[]
  ) {}

  protected abstract addJob<TData = unknown>(
    jobName: JobCronNameEnum,
    processor: CronJobProcessor<TData>,
    interval: string,
    options: CronOptions
  ): Promise<void>;

  protected abstract removeJob(jobName: JobCronNameEnum): Promise<void>;

  protected abstract getMetrics(): Promise<CronMetrics>;

  protected abstract initialize(): Promise<void>;

  protected abstract shutdown(): Promise<void>;

  /**
   * This method is called when the application has fully started up.
   * It ensures that all relevant jobs are added to the CRON service before starting up.
   */
  async onApplicationBootstrap() {
    if (!this.activeJobs || this.activeJobs.length === 0) {
      Logger.verbose(
        `The '${this.cronServiceName}' CRON service has no active jobs and will not start up`,
        LOG_CONTEXT
      );

      return;
    } else {
      Logger.log(`Active CRON jobs found for ${this.cronServiceName}: [${this.activeJobs.join(', ')}]`, LOG_CONTEXT);
    }

    try {
      Logger.log(`Starting the '${this.cronServiceName}' CRON service up`, LOG_CONTEXT);
      let retries = CRON_STARTUP_RETRIES;
      const createTimeoutPromise = () =>
        new Promise((resolve, reject) => {
          setTimeout(
            () => reject(`Timed out while starting the ${this.cronServiceName} CRON service`),
            CRON_STARTUP_TIMEOUT
          );
        });

      while (retries > 0) {
        try {
          await Promise.race([this.initialize(), createTimeoutPromise()]);
          break; // If the promise is resolved, break the loop
        } catch (error) {
          retries -= 1;
          if (retries === 0) throw error; // If it's the last retry, throw the error
          Logger.warn(
            `Attempt ${CRON_STARTUP_RETRIES - retries} to start the '${
              this.cronServiceName
            }' CRON service failed. Retrying...`,
            LOG_CONTEXT
          );
        }
      }
      await this.createSendCronMetricsJob();
      Logger.log(`Starting up the '${this.cronServiceName}' CRON service has finished`, LOG_CONTEXT);
    } catch (error) {
      Logger.error(
        `Failed to start the '${this.cronServiceName}' CRON service after ${CRON_STARTUP_RETRIES} retries`,
        error,
        LOG_CONTEXT
      );
    }
  }

  /**
   * This method is called when the application is shutting down.
   * It ensures that all relevant jobs are removed from the CRON service before shutting down.
   */
  async onApplicationShutdown() {
    if (!this.activeJobs || this.activeJobs.length === 0) {
      Logger.verbose(
        `The '${this.cronServiceName}' CRON service has no active jobs and will not shut down`,
        LOG_CONTEXT
      );

      return;
    }

    try {
      Logger.log(`Shutting the '${this.cronServiceName}' CRON service down`, LOG_CONTEXT);
      await this.shutdown();
      Logger.log(`Shutting down the '${this.cronServiceName}' CRON service has finished`, LOG_CONTEXT);
    } catch (error) {
      Logger.error(`Failed to shut down the '${this.cronServiceName}' CRON service`, error, LOG_CONTEXT);
    }
  }

  private isActiveJob(jobName: JobCronNameEnum): boolean {
    return this.activeJobs.includes(jobName);
  }

  public async add<TData = unknown>(
    jobName: JobCronNameEnum,
    processor: (job: CronJobData<TData>) => Promise<void>,
    interval: string,
    options: CronOptions
  ): Promise<void> {
    if (!this.isActiveJob(jobName)) {
      Logger.verbose(`The '${jobName}' job is not active and will not be added to the CRON service`, LOG_CONTEXT);

      return;
    }

    const combinedOptions = {
      ...DEFAULT_CRON_OPTIONS,
      ...options,
    };
    this.handleJobOutcome(jobName, CronMetricsEventEnum.CREATE_STARTED);
    try {
      const _this = this;
      this.addJob(
        jobName,
        async function runCronJob(job) {
          nr.startBackgroundTransaction(
            ObservabilityBackgroundTransactionEnum.CRON_JOB_QUEUE,
            `cron-${jobName}`,
            function transactionHandler() {
              return new Promise<void>(async (resolve, reject) => {
                const transaction = nr.getTransaction();
                try {
                  _this.handleJobOutcome(jobName, CronMetricsEventEnum.STARTED);
                  await processor({
                    name: jobName,
                    startedAt: job.startedAt,
                    data: job.data as TData,
                  });
                  _this.handleJobOutcome(jobName, CronMetricsEventEnum.COMPLETED);
                  resolve();
                } catch (error) {
                  _this.handleJobOutcome(jobName, CronMetricsEventEnum.FAILED, error);
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
      this.handleJobOutcome(jobName, CronMetricsEventEnum.CREATE_COMPLETED);
    } catch (error) {
      this.handleJobOutcome(jobName, CronMetricsEventEnum.CREATE_FAILED, error);
      throw error;
    }
  }

  public async remove(jobName: JobCronNameEnum) {
    this.handleJobOutcome(jobName, CronMetricsEventEnum.CANCEL_STARTED);
    try {
      await this.removeJob(jobName);
      this.handleJobOutcome(jobName, CronMetricsEventEnum.CANCEL_COMPLETED);
    } catch (error) {
      this.handleJobOutcome(jobName, CronMetricsEventEnum.CANCEL_FAILED, error);
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
        `Cron/${this.deploymentName}/${jobName}/${CronMetricsEventEnum.ACTIVE}`,
        jobMetrics.active
      );
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/${CronMetricsEventEnum.WAITING}`,
        jobMetrics.waiting
      );
    });
  }

  private handleJobOutcome(jobName: JobCronNameEnum, event: CronMetricsEventEnum, error?: unknown) {
    const outcomeMessage = `Cron/${this.deploymentName}/${jobName}/${event}`;
    this.metricsService.recordMetric(outcomeMessage, 1);

    const eventName = this.kebabToSentenceCase(event);
    const logMessage = `${eventName}: '${jobName}' job`;

    if (error) {
      if (process.env.SENTRY_DSN) {
        captureException(error, { tags: { jobName, event, eventName } });
      }
      Logger.error(logMessage, error, LOG_CONTEXT);
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
