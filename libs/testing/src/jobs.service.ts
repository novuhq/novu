import { Queue } from 'bullmq';
import { setTimeout } from 'node:timers/promises';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { TestingQueueService } from './testing-queue.service';

/**
 * This service is contains utilities to manage the jobs in the Redis queue and Mongo during testing.
 */
export class JobsService {
  public standardQueue: Queue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
  public workflowQueue: Queue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
  public subscriberProcessQueue: Queue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;

  constructor(private jobRepository: JobRepository = new JobRepository()) {}

  /**
   * Wait for all jobs to be completed from the Redis queue and Mongo
   *
   * @param templateId - The template ID to wait for (optional)
   * @param organizationId - The organization ID to wait for (optional)
   */
  public async waitForJobCompletion({
    templateId,
    organizationId,
  }: {
    templateId?: string | string[];
    organizationId?: string | string[];
  }) {
    const workflowMatch = templateId ? { _templateId: { $in: [templateId].flat() } } : {};
    const organizationMatch = organizationId ? { _organizationId: { $in: [organizationId].flat() } } : {};

    let redisJobsCount = 0;
    let mongoJobsCount = 0;

    do {
      await setTimeout(100);

      const metrics = await this.getQueueMetrics();

      redisJobsCount = metrics.totalCount;

      mongoJobsCount = Math.max(
        // @ts-expect-error
        await this.jobRepository.count({
          ...workflowMatch,
          ...organizationMatch,
          status: {
            $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
          },
        }),
        0
      );

      // console.log('AwaitRunningJobs:>', metrics);
    } while (redisJobsCount > 0 || mongoJobsCount > 0);
  }

  /**
   * Wait for all jobs to be completed from the Redis queue and Mongo
   *
   * @param templateId - The template ID to wait for (optional)
   * @param organizationId - The organization ID to wait for (optional)
   */
  public async waitForDbJobCompletion({
    templateId,
    organizationId,
  }: {
    templateId?: string | string[];
    organizationId?: string | string[];
  }) {
    const workflowMatch = templateId ? { _templateId: { $in: [templateId].flat() } } : {};
    const organizationMatch = organizationId ? { _organizationId: { $in: [organizationId].flat() } } : {};

    let mongoJobsCount = 0;

    do {
      await setTimeout(100);

      mongoJobsCount = Math.max(
        // @ts-expect-error
        await this.jobRepository.count({
          ...workflowMatch,
          ...organizationMatch,
          status: {
            $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
          },
        }),
        0
      );
    } while (mongoJobsCount > 0);
  }

  /**
   * Wait for all jobs to be completed from the workflow Redis queue
   *
   * |----------------|------------------|----------------|
   * | workflow queue > subscriber queue > standard queue |
   * |----------------|------------------|----------------|
   *
   * @remarks
   * This is useful in testing when you want the trigger to be asserted in specific parts of the execution.
   * For example, you can wait for the workflow queue to be completed and then assert that the trigger was sent to the subscriber queue.
   */
  public async waitForWorkflowQueueCompletion(maxWaitTime = 10000) {
    return this.waitQueueUntil(
      ({ activeWorkflowJobsCount, waitingWorkflowJobsCount }) => activeWorkflowJobsCount + waitingWorkflowJobsCount > 0,
      maxWaitTime
    );
  }

  /**
   * Wait for all jobs to be completed from the subscriber Redis queue.
   *
   * |----------------|------------------|----------------|
   * | workflow queue > subscriber queue > standard queue |
   * |----------------|------------------|----------------|
   *
   * @remarks
   * This is useful in testing when you want the trigger to be asserted in specific parts of the execution.
   * For example, you can wait for the subscriber queue to be completed and then assert that the trigger was sent to the standard queue.
   */
  public async waitForSubscriberQueueCompletion(maxWaitTime = 10000) {
    return this.waitQueueUntil(
      ({ activeSubscriberJobsCount, waitingSubscriberJobsCount }) =>
        activeSubscriberJobsCount + waitingSubscriberJobsCount > 0,
      maxWaitTime
    );
  }

  /**
   * Wait for all jobs to be completed from the standard Redis queue
   *
   * |----------------|------------------|----------------|
   * | workflow queue > subscriber queue > standard queue |
   * |----------------|------------------|----------------|
   *
   * @remarks
   * This is useful in testing when you want the trigger to be asserted in specific parts of the execution.
   * For example, you can wait for the standard queue to be completed and then assert against the stage of the job in Mongo
   */
  public async waitForStandardQueueCompletion(maxWaitTime = 10000) {
    return this.waitQueueUntil(
      ({ activeStandardJobsCount, waitingStandardJobsCount }) => activeStandardJobsCount + waitingStandardJobsCount > 0,
      maxWaitTime
    );
  }

  public async waitQueueUntil(
    cb: (metrics: Awaited<ReturnType<typeof this.getQueueMetrics>>) => boolean,
    maxWaitTime = 10000
  ) {
    const startTime = Date.now();
    const safeMaxWaitTime = Math.min(200, maxWaitTime);

    let queueMetrics: Awaited<ReturnType<typeof this.getQueueMetrics>>;

    do {
      await setTimeout(100);
      queueMetrics = await this.getQueueMetrics();
    } while (cb(queueMetrics) && Date.now() - startTime < safeMaxWaitTime);
  }

  public async runStandardQueueDelayedJobsImmediately() {
    const delayedJobs = await this.standardQueue.getDelayed();
    await Promise.all(delayedJobs.map((job) => job.promote()));
  }

  private async getQueueMetrics() {
    const [
      activeWorkflowJobsCount,
      waitingWorkflowJobsCount,
      failedWorkflowJobsCount,
      completedWorkflowJobsCount,
      delayedWorkflowJobsCount,

      activeSubscriberJobsCount,
      waitingSubscriberJobsCount,
      failedSubscriberJobsCount,
      completedSubscriberJobsCount,
      delayedSubscriberJobsCount,

      activeStandardJobsCount,
      waitingStandardJobsCount,
      failedStandardJobsCount,
      completedStandardJobsCount,
      delayedStandardJobsCount,
    ] = await Promise.all([
      this.workflowQueue.getActiveCount(),
      this.workflowQueue.getWaitingCount(),
      this.workflowQueue.getFailedCount(),
      this.workflowQueue.getCompletedCount(),
      this.workflowQueue.getDelayedCount(),

      this.subscriberProcessQueue.getActiveCount(),
      this.subscriberProcessQueue.getWaitingCount(),
      this.subscriberProcessQueue.getFailedCount(),
      this.subscriberProcessQueue.getCompletedCount(),
      this.subscriberProcessQueue.getDelayedCount(),

      this.standardQueue.getActiveCount(),
      this.standardQueue.getWaitingCount(),
      this.standardQueue.getFailedCount(),
      this.standardQueue.getCompletedCount(),
      this.standardQueue.getDelayedCount(),
    ]);

    const totalCount =
      activeWorkflowJobsCount +
      waitingWorkflowJobsCount +
      activeSubscriberJobsCount +
      waitingSubscriberJobsCount +
      activeStandardJobsCount +
      waitingStandardJobsCount;

    return {
      totalCount,

      activeWorkflowJobsCount,
      waitingWorkflowJobsCount,
      failedWorkflowJobsCount,
      completedWorkflowJobsCount,
      delayedWorkflowJobsCount,

      activeSubscriberJobsCount,
      waitingSubscriberJobsCount,
      failedSubscriberJobsCount,
      completedSubscriberJobsCount,
      delayedSubscriberJobsCount,

      activeStandardJobsCount,
      waitingStandardJobsCount,
      failedStandardJobsCount,
      completedStandardJobsCount,
      delayedStandardJobsCount,
    };
  }
}
