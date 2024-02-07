const nr = require('newrelic');
import { Agenda, Job } from '@hokify/agenda';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { MetricsService } from '../metrics';

const LOG_CONTEXT = 'CronService';
const CRON_TIMEZONE = 'Etc/UTC';

const METRICS_CRON_INTERVAL = '* * * * *';
const METRICS_JOB_NAME = 'send-cron-metrics';
const METRICS_JOB_CONCURRENCY = 1;
const METRICS_JOB_LOCK_LIFETIME = 1 * 60 * 1000; // 1 minute

export class CronService implements OnModuleInit, OnModuleDestroy {
  private deploymentName = process.env.FLEET_NAME ?? 'default';

  constructor(
    private agenda: Agenda,
    private metricsService?: MetricsService
  ) {}
  async onModuleInit() {
    Logger.log('Starting the CRON service up', LOG_CONTEXT);
    await this.agenda.start();
    Logger.log('Starting up the CRON service has finished', LOG_CONTEXT);
  }
  async onModuleDestroy() {
    Logger.log('Shutting the CRON service down', LOG_CONTEXT);
    await this.agenda.stop();
    Logger.log('Shutting down the CRON service has finished', LOG_CONTEXT);
  }

  public async add<TData>(
    jobName: string,
    processor: (job: Job<TData>) => Promise<void>,
    interval: string,
    definitionOptions: Parameters<typeof Agenda.prototype.define>['2'] = {},
    scheduleOptions: Parameters<typeof Agenda.prototype.every>['2'] = {
      timezone: CRON_TIMEZONE,
    }
  ) {
    Logger.log(`Creating '${jobName}' job`, LOG_CONTEXT);
    try {
      this.agenda.define<TData>(
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
                  Logger.log(`Starting '${jobName}' job`, LOG_CONTEXT);
                  _this.metricsService.recordMetric(
                    `Cron/${_this.deploymentName}/${jobName}/started`,
                    1
                  );
                  await processor(job);
                  _this.metricsService.recordMetric(
                    `Cron/${_this.deploymentName}/${jobName}/completed`,
                    1
                  );
                  Logger.log(`Completed '${jobName}' job`, LOG_CONTEXT);
                  resolve();
                } catch (error) {
                  _this.metricsService.recordMetric(
                    `Cron/${_this.deploymentName}/${jobName}/failed`,
                    1
                  );
                  Logger.error(
                    `Failed to run '${jobName}' job: ${JSON.stringify(error)}`,
                    LOG_CONTEXT
                  );
                  reject(error);
                } finally {
                  transaction.end();
                }
              });
            }
          );
        },
        definitionOptions
      );

      await this.agenda.every(interval, jobName, scheduleOptions);

      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/created-successful`,
        1
      );
      Logger.log(`Completed creation of '${jobName}' job`, LOG_CONTEXT);
    } catch (error) {
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/created-failed`,
        1
      );
      Logger.error(
        `Failed to create '${jobName}' job: ${JSON.stringify(error)}`,
        LOG_CONTEXT
      );
    }
  }

  public async remove(jobName: string) {
    Logger.log(`Removing '${jobName}' job`, LOG_CONTEXT);
    try {
      await this.agenda.cancel({ name: jobName });
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/cancelled-successful`,
        1
      );
      Logger.log(`Completed removal of '${jobName}' job`, LOG_CONTEXT);
    } catch (error) {
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/cancelled-failed`,
        1
      );
      Logger.error(
        `Failed to remove '${jobName}' job: ${JSON.stringify(error)}`,
        LOG_CONTEXT
      );
    }
  }

  async addSendMetricsJob() {
    this.add(
      METRICS_JOB_NAME,
      async () => {
        await this.sendMetrics();
      },
      METRICS_CRON_INTERVAL,
      {
        concurrency: METRICS_JOB_CONCURRENCY,
        lockLifetime: METRICS_JOB_LOCK_LIFETIME,
      }
    );
  }

  async sendMetrics() {
    const stats = await this.agenda.getRunningStats();

    Object.entries(stats.jobStatus).forEach(([jobName, jobCount]) => {
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/active`,
        jobCount.running
      );
      this.metricsService.recordMetric(
        `Cron/${this.deploymentName}/${jobName}/waiting`,
        jobCount.locked
      );
    });
  }
}
