import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobRepository, JobStatusEnum } from '@novu/dal';

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
      const stuckJobs = await this.jobRepository.find(
        {
          status: JobStatusEnum.DELAYED,
          scheduleExtensionsCount: { $gt: 0 },
          updatedAt: { $lt: delayCutoff },
        },
        '_id _environmentId _organizationId _userId',
        { limit: this.MAX_RECONCILE_PER_RUN }
      );

      if (stuckJobs.length === 0) {
        return;
      }

      this.logger.warn({ count: stuckJobs.length }, 'Found stuck DELAYED jobs, attempting recovery');

      let recovered = 0;
      let skipped = 0;

      for (const job of stuckJobs) {
        try {
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

          await this.standardQueueService.add({
            name: job._id,
            data: {
              _environmentId: job._environmentId,
              _id: job._id,
              _organizationId: job._organizationId,
              _userId: job._userId,
            },
            groupId: job._organizationId,
            options: { delay: 0 },
          });

          recovered++;
          this.logger.warn({ jobId: job._id }, 'Recovered stuck DELAYED job');
        } catch (err) {
          this.logger.error({ err, jobId: job._id }, 'Failed to recover stuck job');
        }
      }

      this.logger.warn(
        { recovered, skipped, total: stuckJobs.length },
        'Job reconciliation completed'
      );
    } catch (err) {
      this.logger.error({ err }, 'Job reconciliation failed');
    }
  }
}
