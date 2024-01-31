/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
import { expect } from 'chai';
import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
  JobEntity,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum, IDigestRegularMetadata } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';

const axiosInstance = axios.create();

const promiseTimeout = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Trigger event - Scheduled Digest Mode - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();

  const triggerEvent = async (payload, transactionId?: string): Promise<void> => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        transactionId,
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload,
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should digest events using a scheduled digest', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 1,
            type: DigestTypeEnum.TIMED,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const events = [
      { customVar: 'Testing of User Name' },
      { customVar: 'digest' },
      { customVar: 'merged' },
      { customVar: 'digest' },
      { customVar: 'merged' },
      { customVar: 'digest' },
      { customVar: 'merged' },
    ];

    await Promise.all(events.map((event) => triggerEvent(event)));

    const handler = await session.awaitRunningJobs(template?._id, false, 1);

    await handler.runDelayedImmediately();
    await session.awaitRunningJobs(template?._id);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(7);

    const completedJob = jobs.find((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJob).to.ok;

    const mergedJob = jobs.find((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJob).to.ok;

    const generatedMessageJob = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.IN_APP,
    });

    expect(generatedMessageJob && generatedMessageJob.length).to.equal(7);

    const mergedInApp = generatedMessageJob.filter((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedInApp && mergedInApp.length).to.equal(6);

    const completedInApp = generatedMessageJob.filter((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedInApp && completedInApp.length).to.equal(1);

    const digestEventLength = completedInApp.find((i) => i.digest?.events?.length === 7);
    expect(digestEventLength).to.be.ok;
  });
});
