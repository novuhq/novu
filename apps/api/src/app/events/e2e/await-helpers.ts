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
      if (count >= expectedCount) break;
      await sleep(300);
      retryCount++;
    } while (true);

    return await this.jobRepository.find(query);
  }

  async getNotificationCount(template: NotificationTemplateEntity, expectedCount: number) {
    const query = { _organizationId: template._organizationId, _templateId: template._id };
    do {
      const count = await this.notificationRepository?.count(query);
      //console.log(`getNotificationCount:${count}/${expectedCount}`);
      if (count >= expectedCount) return count;
      sleep(300);
    } while (true);
  }

  async awaitAndGetMessages(template: NotificationTemplateEntity, expectedCount: number) {
    if (!template) throw new ApiException('template is null');
    const query = { _environmentId: template._environmentId, _templateId: template._id };
    do {
      const count = await this.messageRepository.count(query);
      //console.log(`getNotificationCount:${count}/${expectedCount}`);
      if (count >= expectedCount) break;
      await sleep(300);
    } while (true);

    return await this.messageRepository.find(query);
  }

  async processAllDelayJobs(template: NotificationTemplateEntity) {
    const query = {
      _organizationId: template._organizationId,
      _templateId: template._id,
      status: JobStatusEnum.QUEUED,
    };
    do {
      const delayJobs = await this.jobRepository.find(query);
      if (delayJobs.length === 0) return;
      for (const delayJob of delayJobs) {
        await this.promoteJob(delayJob._id);
      }
      //console.log('delayJobs processed', delayJobs.length);
      await sleep(300);
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
