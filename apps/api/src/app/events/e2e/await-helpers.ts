import {
  NotificationRepository,
  MessageRepository,
  NotificationTemplateEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { WorkflowQueueService } from '../services/workflow-queue/workflow.queue.service';
import { ApiException } from '../../shared/exceptions/api.exception';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRIES = 9;
const SLEEP_TIME = 900;
export class AwaitHelpers {
  constructor(
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository | undefined,
    private messageRepository: MessageRepository,
    private workflowQueueService: WorkflowQueueService
  ) {}
  async awaitAndGetJobs(template: NotificationTemplateEntity, expectedCount: number, type = null) {
    const query: any = { _organizationId: template._organizationId, _templateId: template._id };
    if (type) query.type = type;
    let retryCount = 0;
    do {
      const count = await this.jobRepository.count(query);
      console.log(`awaitAndGetJobs:${count}/${expectedCount}`);
      if (count >= expectedCount || retryCount >= MAX_RETRIES) break;
      await sleep(SLEEP_TIME);
      retryCount++;
    } while (true);

    return await this.jobRepository.find(query);
  }

  async awaitForDigest(digestJobId, digestCount) {
    let retryCount = 0;
    do {
      const count = (await this.jobRepository.findById(digestJobId))?.digestedNotificationIds?.length;
      console.log(`awaitForDigest:${count}/${digestCount}`);
      if ((count && count >= digestCount) || retryCount >= MAX_RETRIES) return count;
      await sleep(SLEEP_TIME);
      retryCount++;
    } while (true);
  }

  async getNotificationCount(template: NotificationTemplateEntity, expectedCount: number) {
    const query = { _organizationId: template._organizationId, _templateId: template._id };
    let retryCount = 0;
    do {
      const count = await this.notificationRepository?.count(query);
      console.log(`getNotificationCount:${count}/${expectedCount}`);
      if ((count && count >= expectedCount) || retryCount >= MAX_RETRIES) return count;
      sleep(SLEEP_TIME);
      retryCount++;
    } while (true);
  }

  async awaitAndGetMessages(template: NotificationTemplateEntity, expectedCount: number) {
    if (!template) throw new ApiException('template is null');
    const query = { _environmentId: template._environmentId, _templateId: template._id };
    let retryCount = 0;
    do {
      const count = await this.messageRepository.count(query);
      console.log(`awaitAndGetMessages:${count}/${expectedCount}`);
      if (count >= expectedCount || retryCount >= MAX_RETRIES) break;
      await sleep(SLEEP_TIME);
      retryCount++;
    } while (true);

    return await this.messageRepository.find(query);
  }

  async processAllDelayJobs(template: NotificationTemplateEntity) {
    const query = {
      _organizationId: template._organizationId,
      _templateId: template._id,
      status: JobStatusEnum.QUEUED,
    };
    let retryCount = 0;
    do {
      const delayJobs = await this.jobRepository.find(query);
      if (delayJobs.length === 0 || retryCount >= MAX_RETRIES) return;
      for (const delayJob of delayJobs) {
        await this.promoteJob(delayJob._id);
      }
      console.log('delayJobs processed', delayJobs.length);
      await sleep(SLEEP_TIME);
      retryCount++;
    } while (true);
  }

  async promoteJob(jobId) {
    try {
      await this.workflowQueueService.promoteJob(jobId);
    } catch (error) {
      //console.log(error.message);
    }
  }
}
