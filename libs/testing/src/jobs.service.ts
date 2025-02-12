import { Queue } from 'bullmq';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum, StepTypeEnum } from '@novu/shared';

import { TestingQueueService } from './testing-queue.service';

const promote = async (job) => {
  try {
    await job.promote();
  } catch (error) {
    // Silently handle promotion failures since job may have already executed
  }
};

export class JobsService {
  private jobRepository = new JobRepository();

  public standardQueue: Queue;
  public workflowQueue: Queue;
  public subscriberProcessQueue: Queue;
  constructor(private isClusterMode?: boolean) {
    this.workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
    this.standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
    this.subscriberProcessQueue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;
  }

  public async queueGet(jobTopicName: JobTopicNameEnum, getter: 'getDelayed') {
    let queue: Queue;

    switch (jobTopicName) {
      case JobTopicNameEnum.WORKFLOW:
        queue = this.workflowQueue;
        break;
      case JobTopicNameEnum.STANDARD:
        queue = this.standardQueue;
        break;
      case JobTopicNameEnum.PROCESS_SUBSCRIBER:
        queue = this.subscriberProcessQueue;
        break;
      default:
        throw new Error(`Invalid job topic name: ${jobTopicName}`);
    }

    switch (getter) {
      case 'getDelayed':
        return queue.getDelayed();
      default:
        throw new Error(`Invalid getter: ${getter}`);
    }
  }

  public async waitForJobCompletion({
    templateId,
    organizationId,
    delay,
    unfinishedJobs = 0,
  }: {
    templateId?: string | string[];
    organizationId?: string;
    delay?: boolean;
    unfinishedJobs?: number;
  }) {
    let runningJobs = 0;
    const safeUnfinishedJobs = Math.max(unfinishedJobs, 0);

    const workflowMatch = templateId ? { _templateId: { $in: [templateId].flat() } } : {};
    const typeMatch = delay
      ? {
          type: {
            $nin: [delay ? StepTypeEnum.DELAY : StepTypeEnum.DIGEST],
          },
        }
      : {};

    let totalCount = 0;

    do {
      // Wait until Bull queues are empty
      totalCount = (await this.getQueueMetric()).totalCount;
      // Wait until there are no pending, queued or running jobs in Mongo
      runningJobs = Math.max(
        await this.jobRepository.count({
          ...((organizationId ? { _organizationId: organizationId } : {}) as { _organizationId: string }),
          ...typeMatch,
          ...workflowMatch,
          status: {
            $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
          },
        }),
        0
      );
    } while (totalCount > 0 || runningJobs > safeUnfinishedJobs);
  }

  public async runAllDelayedJobsImmediately() {
    const delayedJobs = await this.standardQueue.getDelayed();
    await Promise.all(delayedJobs.map((job) => job.promote()));
  }

  public async awaitAllJobs() {
    let hasMoreDelayedJobs = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 20;
    await this.waitForJobCompletion({});

    while (hasMoreDelayedJobs && iterationCount < MAX_ITERATIONS) {
      const jobsResult = await Promise.all([
        this.standardQueue.getDelayed(),
        this.workflowQueue.getDelayed(),
        this.subscriberProcessQueue.getDelayed(),
      ]);
      const jobs = jobsResult.flat();

      if (jobs.length === 0) {
        hasMoreDelayedJobs = false;
        continue;
      }

      await Promise.all(jobs.map(promote));
      await this.waitForJobCompletion({});
      iterationCount += 1;
    }

    if (iterationCount >= MAX_ITERATIONS) {
      // eslint-disable-next-line no-console
      console.warn(
        'Max iterations reached while processing delayed jobs. This might indicate an infinite loop in job creation.'
      );
    }
  }

  private async getQueueMetric() {
    const [
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
    ] = await Promise.all([
      this.workflowQueue.getActiveCount(),
      this.workflowQueue.getWaitingCount(),

      this.standardQueue.getWaitingCount(),
      this.standardQueue.getActiveCount(),

      this.subscriberProcessQueue.getWaitingCount(),
      this.subscriberProcessQueue.getActiveCount(),
    ]);

    const totalCount =
      parsedEvents +
      waitingCount +
      waitingStandardJobsCount +
      activeStandardJobsCount +
      subscriberProcessQueueWaitingCount +
      subscriberProcessQueueActiveCount;

    return {
      totalCount,
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
    };
  }
}
