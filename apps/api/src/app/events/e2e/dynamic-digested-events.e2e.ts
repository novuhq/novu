import { NotificationRepository, MessageRepository, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { WorkflowQueueService } from '../services/workflow-queue/workflow.queue.service';
import { EventsDataGenerator, totalExpectedJobCounts } from './events-data-helper';
import { AwaitHelpers } from './await-helpers';

describe('Trigger event - Dynamic Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let eventsDataGenerator: EventsDataGenerator;
  let awaitHelpers: AwaitHelpers;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();
  const notificationRepository = new NotificationRepository();
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    eventsDataGenerator = new EventsDataGenerator(session);
    workflowQueueService = session.testServer?.getService(WorkflowQueueService);
    awaitHelpers = new AwaitHelpers(jobRepository, notificationRepository, messageRepository, workflowQueueService);
  });

  xit('should test all possible digest events #########Dynamic############', async () => {
    const triggeredEvents = await eventsDataGenerator.triggerMultipleEvents(30);
    const { template, payloadArray } = triggeredEvents;
    session.awaitParsingEvents();
    const notificationCount = payloadArray.length;
    const { digestJobCount, totalJobCount, digestChildJobCount } = totalExpectedJobCounts(template, payloadArray);
    const jobs = await awaitHelpers.awaitAndGetJobs(template, totalJobCount - digestChildJobCount);
    const digestJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.QUEUED,
      type: StepTypeEnum.DIGEST,
    });

    for (const digestJob of digestJobs) await awaitHelpers.promoteJob(digestJob._id);

    expect(digestJobs.length, 'Digest jobs count check').to.equal(digestJobCount);

    await awaitHelpers.processAllDelayJobs(template);
    const messageCount = totalJobCount - digestJobCount;
    const messages = await awaitHelpers.awaitAndGetMessages(template, messageCount);

    expect(await awaitHelpers.getNotificationCount(template, notificationCount), 'Notification count check').to.equal(
      notificationCount
    );
    const digestMessages = messages.filter((message) => message.content.toString().includes('HAS_DIGEST_PROP'));
    if (digestMessages.length != digestChildJobCount) {
      const allJobs = await awaitHelpers.awaitAndGetJobs(template, totalJobCount);
    }
    expect(messages.length, 'Message count check').to.equal(messageCount);
    expect(digestMessages.length, 'Digest message count check').to.equal(digestChildJobCount);
  });
});
