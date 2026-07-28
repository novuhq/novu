import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';

const LOG_CONTEXT = 'JobReconciliationService';

@Injectable()
export class JobReconciliationService {
  private readonly RECONCILIATION_BACKOFF_MS = 10_000;
  private readonly MAX_RECONCILE_PER_RUN = 100;

  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(LOG_CONTEXT);
  }

  async reconcileOnStartup(): Promise<void> {
    this.logger.warn('Starting startup job reconciliation for stuck DELAYED jobs');

    try {
      const delayCutoff = new Date(Date.now() - this.RECONCILIATION_BACKOFF_MS);
      const projection = '_id _environmentId _organizationId _userId nextScheduledAt';
      let skip = 0;
      let batch: JobEntity[];

      do {
        const query = {
          _organizationId: { $exists: true },
          status: JobStatusEnum.DELAYED,
          scheduleExtensionsCount: { $gt: 0 },
          updatedAt: { $lt: delayCutoff },
        } as any;
        batch = await this.jobRepository.find(
          query,
          projection,
          {
            limit: this.MAX_RECONCILE_PER_RUN,
            skip,
          }
        );

        if (batch.length === 0) {
          break;
        }

        this.logger.warn({ count: batch.length }, 'Found stuck DELAYED jobs, attempting recovery');

        let recovered = 0;
        let skipped = 0;

        for (const job of batch) {
          const remainingDelay = job.nextScheduledAt
            ? Math.max(0, new Date(job.nextScheduledAt).getTime() - Date.now())
            : 0;

          try {
            // 1. Queue the job FIRST. If the queue fails the job stays DELAYED and
            //    will be retried on the next reconciliation run.
            await this.standardQueueService.add({
              name: job._id,
              data: {
                _environmentId: job._environmentId,
                _id: job._id,
                _organizationId: job._organizationId,
                _userId: job._userId,
              },
              groupId: job._organizationId,
              options: { delay: remainingDelay },
            });

            // 2. THEN claim the job atomically.
            const claimed = await this.jobRepository.findOneAndUpdate(
              {
                _id: job._id,
                _environmentId: job._environmentId,
                status: JobStatusEnum.DELAYED,
              },
              { $set: { status: JobStatusEnum.QUEUED } },
              { new: true }
            );

            if (!claimed) {
              skipped++;
              continue;
            }

            recovered++;
            this.logger.warn({ jobId: job._id, remainingDelay }, 'Recovered stuck DELAYED job');
          } catch (err) {
            this.logger.error({ err, jobId: job._id }, 'Failed to recover stuck job');
          }
        }

        this.logger.warn(
          { recovered, skipped, total: batch.length },
          'Job reconciliation batch completed'
        );

        skip += batch.length;
      } while (batch.length === this.MAX_RECONCILE_PER_RUN);

      this.logger.warn('Job reconciliation finished');
    } catch (err) {
      this.logger.error({ err }, 'Job reconciliation failed');
    }
  }
}
