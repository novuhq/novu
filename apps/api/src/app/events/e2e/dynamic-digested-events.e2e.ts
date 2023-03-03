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
  let triggeredEvents;
  let expectedCounts;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    eventsDataGenerator = new EventsDataGenerator(session);
    workflowQueueService = session.testServer?.getService(WorkflowQueueService);
    awaitHelpers = new AwaitHelpers(jobRepository, notificationRepository, messageRepository, workflowQueueService);
    triggeredEvents = await eventsDataGenerator.triggerMultipleEvents(15);
    expectedCounts = totalExpectedJobCounts(triggeredEvents.template, triggeredEvents.payloadArray);
  });
  afterEach(function () {
    if (this.currentTest.state === 'failed') {
      console.log('Current test failed', this.currentTest?.title);
      console.log('template', JSON.stringify(triggeredEvents.template, null, 2));
      console.log('expectedCounts', expectedCounts);
    }
  });
  xit('should test all possible digest events #########Dynamic############', async () => {
    const { template, payloadArray } = triggeredEvents;
    const { digestJobCount, totalJobCount, digestChildJobCount } = expectedCounts;
    session.awaitParsingEvents();
    const notificationCount = payloadArray.length;
    expect(await awaitHelpers.getNotificationCount(template, notificationCount), 'Notification count check').to.equal(
      notificationCount
    );
    const digestJobs = await awaitHelpers.awaitAndGetJobs(template, digestJobCount, StepTypeEnum.DIGEST);
    for (const digestJob of digestJobs) await awaitHelpers.promoteJob(digestJob._id);

    expect(digestJobs.length, 'Digest jobs count check').to.equal(digestJobCount);

    await awaitHelpers.processAllDelayJobs(template);
    const messageCount = totalJobCount - digestJobCount;
    const messages = await awaitHelpers.awaitAndGetMessages(template, messageCount);
    console.log('messages', messages);
    const digestMessages = messages.filter((message) => message.content.toString().includes('HAS_DIGEST_PROP'));
    expect(messages.length, 'Message count check').to.equal(messageCount);
    expect(digestMessages.length, 'Digest message count check').to.equal(digestChildJobCount);
  });
});
