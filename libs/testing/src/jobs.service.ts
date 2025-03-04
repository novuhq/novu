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

const finalizedStatuses = [
  JobStatusEnum.COMPLETED,
  JobStatusEnum.SKIPPED,
  JobStatusEnum.FAILED,
  JobStatusEnum.CANCELED,
  JobStatusEnum.MERGED,
];
const immediateJobStatuses = [JobStatusEnum.QUEUED, JobStatusEnum.RUNNING];

type QueueJobCountsResult = {
  active: number;
  waiting: number;
  delayed: number;
  completed: number;
  failed?: number;
  'active-waiting': number;
  [key: string]: number | undefined;
};

function sumActiveAndWaitingJobs(queueState: QueueJobCountsResult) {
  return queueState.active + queueState.waiting;
}

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

  public async promoteDelayedJobs() {
    const jobsResult = await Promise.all([
      this.standardQueue.getDelayed(),
      this.workflowQueue.getDelayed(),
      this.subscriberProcessQueue.getDelayed(),
    ]);
    const jobs = jobsResult.flat();

    if (jobs.length === 0) {
      return false;
    }

    await Promise.all(jobs.map(promote));

    return true;
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
    let runningJobsInStorage = 0;
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
      totalCount = (await this.getQueueCount()).totalCount;

      // Wait until there are no pending, queued or running jobs in Mongo
      runningJobsInStorage = Math.max(
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
    } while (totalCount > 0 || runningJobsInStorage > safeUnfinishedJobs);
  }

  public async runAllDelayedJobsImmediately() {
    const delayedJobs = await this.standardQueue.getDelayed();
    await Promise.all(delayedJobs.map((job) => job.promote()));
  }

  public async awaitAllJobs() {
    let hasMoreDelayedJobs = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 20;

    await this.promoteDelayedJobs();

    // todo check of waitForStorageImmediateJobCompletion is needed as it should be equivalent to waitForQueueImmediateJobCompletion
    await this.waitForQueueImmediateJobCompletion();
    await this.waitForStorageImmediateJobCompletion();

    while (hasMoreDelayedJobs && iterationCount < MAX_ITERATIONS) {
      hasMoreDelayedJobs = await this.promoteDelayedJobs();

      if (!hasMoreDelayedJobs) {
        continue;
      }

      // todo check of waitForStorageImmediateJobCompletion is needed as it should be equivalent to waitForQueueImmediateJobCompletion
      await this.waitForQueueImmediateJobCompletion();
      await this.waitForStorageImmediateJobCompletion();
      iterationCount += 1;
    }

    if (iterationCount >= MAX_ITERATIONS) {
      // eslint-disable-next-line no-console
      console.warn(
        'Max iterations reached while processing delayed jobs. This might indicate an infinite loop in job creation.'
      );
    }
  }

  private async getQueueCount() {
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

  public async getQueueMetric() {
    const [workflowQueueState, standardQueueState, subscriberProcessQueueState] = await Promise.all([
      this.workflowQueue.getJobCounts(),
      this.standardQueue.getJobCounts(),
      this.subscriberProcessQueue.getJobCounts(),
    ]);

    const workflowImmediateCount = sumActiveAndWaitingJobs(workflowQueueState as QueueJobCountsResult);
    const standardImmediateCount = sumActiveAndWaitingJobs(standardQueueState as QueueJobCountsResult);
    const subscriberProcessImmediateCount = sumActiveAndWaitingJobs(
      subscriberProcessQueueState as QueueJobCountsResult
    );
    const totalImmediateCount = workflowImmediateCount + standardImmediateCount + subscriberProcessImmediateCount;

    const workflowQueueCount = Object.values(workflowQueueState).reduce((a, b) => a + b, 0);
    const standardQueueCount = Object.values(standardQueueState).reduce((a, b) => a + b, 0);
    const subscriberProcessQueueCount = Object.values(subscriberProcessQueueState).reduce((a, b) => a + b, 0);

    const totalCount = workflowQueueCount + standardQueueCount + subscriberProcessQueueCount;

    return {
      totalCount,
      totalImmediateCount,
      workflowQueueCount,
      standardQueueCount,
      subscriberProcessQueueCount,
      workflowQueueState,
      standardQueueState,
      subscriberProcessQueueState,
    };
  }

  /**
   * Wait until there are no queued or running jobs in Mongo
   * Will not wait for delayed or pending jobs
   */
  public async waitForStorageImmediateJobCompletion() {
    let totalCount = 0;

    do {
      totalCount = await this.jobRepository.count({ status: { $in: immediateJobStatuses } } as any);
    } while (totalCount > 0);
  }

  public async waitForQueueImmediateJobCompletion() {
    let totalCount = 0;

    do {
      totalCount = (await this.getQueueMetric()).totalImmediateCount;
    } while (totalCount > 0);
  }
}
