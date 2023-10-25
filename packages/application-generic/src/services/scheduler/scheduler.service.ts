const nr = require('newrelic');
import { Agenda } from '@hokify/agenda';
import { StandardQueueService } from '../queues';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

export class SchedulerService {
  private agenda: Agenda;
  private readonly JOB_NAME = 'scheduled-jobs';
  constructor(private standardQueueService: StandardQueueService) {
    this.agenda = new Agenda({
      db: {
        collection: 'scheduledjobs',
        address: process.env.MONGO_URL,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    this.agenda.define(
      this.JOB_NAME,
      async (job) => {
        return new Promise((resolve, reject) => {
          nr.startBackgroundTransaction(
            ObservabilityBackgroundTransactionEnum.SCHEDULER_PROCESSING_QUEUE,
            'Trigger Engine',
            function () {
              const transaction = nr.getTransaction();

              _this.standardQueueService
                .addMinimalJob(
                  job.attrs.data.id,
                  job.attrs.data,
                  job.attrs.data._organizationId
                )
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  transaction.end();
                });
            }
          );
        });
      },
      {
        concurrency: 500,
      }
    );
  }

  async start() {
    await this.agenda.start();
  }

  async getPending() {
    const running = await this.agenda.getRunningStats();
  }

  public async scheduleJob(time: Date, data: Record<string, any>) {
    return await this.agenda.schedule(time, this.JOB_NAME, data);
  }
}
