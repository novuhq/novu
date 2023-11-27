/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
import { expect } from 'chai';
import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum, DelayTypeEnum } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';

const axiosInstance = axios.create();

describe('Cancel event - /v1/events/trigger/:transactionId (DELETE)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();

  const triggerEvent = async (payload, transactionId?: string, overrides = {}, to = [subscriber.subscriberId]) => {
    return (
      await axiosInstance.post(
        `${session.serverUrl}/v1/events/trigger`,
        {
          transactionId,
          name: template.triggers[0].identifier,
          to,
          payload,
          overrides,
        },
        {
          headers: {
            authorization: `ApiKey ${session.apiKey}`,
          },
        }
      )
    ).data.data;
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should be able to cancel digest', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id
    );

    await session.awaitRunningJobs(template?._id, false, 1);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(delayedJobs && delayedJobs.length).to.eql(1);

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(0);

    const cancelledDigestJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.CANCELED,
      type: StepTypeEnum.DIGEST,
      transactionId: id,
    });

    expect(cancelledDigestJobs && cancelledDigestJobs.length).to.eql(1);
  });

  it('should be able to cancel delay', async function () {
    const secondSubscriber = await subscriberService.createSubscriber();

    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id,
      {},
      [subscriber.subscriberId, secondSubscriber.subscriberId]
    );

    await session.awaitRunningJobs(template?._id, true, 2);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    let delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(0);

    delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
      transactionId: id,
    });
    expect(delayedJobs[0]!.status).to.equal(JobStatusEnum.CANCELED);
    expect(delayedJobs[1]!.status).to.equal(JobStatusEnum.CANCELED);
  });

  it('should be able to cancel not 1st digest (e.x 2nd,3rd,etc..)', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const trigger1 = await triggerEvent({
      customVar: 'trigger_1_data',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const trigger2 = await triggerEvent({
      customVar: 'trigger_2_data',
    });

    // Wait for trigger2 to be merged to trigger1
    await session.awaitRunningJobs(template?._id, false, 1);

    const trigger3 = await triggerEvent({
      customVar: 'trigger_3_data',
    });

    await session.testAgent.delete(`/v1/events/trigger/${trigger2.transactionId}`).send({});

    await session.awaitRunningJobs(template?._id, false, 0);

    const delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(delayedJobs.length).to.eql(3);

    const cancelledDigestJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.CANCELED,
      type: StepTypeEnum.DIGEST,
      transactionId: trigger2.transactionId,
    });

    expect(cancelledDigestJobs.length).to.eql(1);

    const jobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const rootTrigger = jobs[0];
    expect(rootTrigger.status).to.eql(JobStatusEnum.COMPLETED);
    expect(rootTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(rootTrigger.digest?.events?.length).to.eql(2);
    expect(rootTrigger.digest?.events?.[0].customVar).to.eql('trigger_1_data');
    expect(rootTrigger.digest?.events?.[1].customVar).to.eql('trigger_3_data');

    const secondCancelledTrigger = jobs[1];
    expect(secondCancelledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondCancelledTrigger.status).to.eql(JobStatusEnum.CANCELED);

    const thirdMergedTrigger = jobs[2];
    expect(thirdMergedTrigger.payload.customVar).to.eql('trigger_3_data');
    expect(thirdMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it('should be able to cancel 1st main digest', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const trigger1 = await triggerEvent({
      customVar: 'trigger_1_data',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const trigger2 = await triggerEvent({
      customVar: 'trigger_2_data',
    });

    // Wait for trigger2 to be merged to trigger1
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${trigger1.transactionId}`).send({});

    const trigger3 = await triggerEvent({
      customVar: 'trigger_3_data',
    });

    await session.awaitRunningJobs(template?._id, false, 0);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(3);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
        transactionId: trigger1.transactionId,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(1);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondTrigger = inpAppJobs[1];
    expect(secondTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondTrigger.status).to.eql(JobStatusEnum.COMPLETED);
    expect(secondTrigger.digest?.events?.length).to.eql(2);
    expect(secondTrigger.digest?.events?.[0].customVar).to.eql('trigger_2_data');
    expect(secondTrigger.digest?.events?.[1].customVar).to.eql('trigger_3_data');

    const thirdMergedTrigger = inpAppJobs[2];
    expect(thirdMergedTrigger.payload.customVar).to.eql('trigger_3_data');
    expect(thirdMergedTrigger.digest?.events?.length).to.eql(0);
    expect(thirdMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it('should be able to cancel 1st main digest and then its follower', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const trigger1 = await triggerEvent({
      customVar: 'trigger_1_data',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const trigger2 = await triggerEvent({
      customVar: 'trigger_2_data',
    });

    // Wait for trigger2 to be merged to trigger1
    const mainDigest = trigger1.transactionId;
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${mainDigest}`).send({});

    const trigger3 = await triggerEvent({
      customVar: 'trigger_3_data',
    });

    // Wait for trigger3 to be merged to trigger2
    const followerDigest = trigger2.transactionId;
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${followerDigest}`).send({});

    const trigger4 = await triggerEvent({
      customVar: 'trigger_4_data',
    });

    await session.awaitRunningJobs(template?._id, false, 0);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(4);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
        transactionId: [trigger1.transactionId, trigger2.transactionId],
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(2);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondFollowerCanceledTrigger = inpAppJobs[1];
    expect(secondFollowerCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(secondFollowerCanceledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondFollowerCanceledTrigger.digest?.events?.length).to.eql(0);

    const thirdTriggerLatestFollower = inpAppJobs[2];
    expect(thirdTriggerLatestFollower.payload.customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.status).to.eql(JobStatusEnum.COMPLETED);
    expect(thirdTriggerLatestFollower.digest?.events?.length).to.eql(2);
    expect(thirdTriggerLatestFollower.digest?.events?.[0].customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.digest?.events?.[1].customVar).to.eql('trigger_4_data');

    const fourthMergedTrigger = inpAppJobs[3];
    expect(fourthMergedTrigger.payload.customVar).to.eql('trigger_4_data');
    expect(fourthMergedTrigger.digest?.events?.length).to.eql(0);
    expect(fourthMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it('should be able to cancel 1st main digest and then its follower and last merged notification', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const trigger1 = await triggerEvent({
      customVar: 'trigger_1_data',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const trigger2 = await triggerEvent({
      customVar: 'trigger_2_data',
    });

    // Wait for trigger2 to be merged to trigger1
    const mainDigest = trigger1.transactionId;
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${mainDigest}`).send({});

    const trigger3 = await triggerEvent({
      customVar: 'trigger_3_data',
    });

    // Wait for trigger3 to be merged to trigger2
    const followerDigest = trigger2.transactionId;
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${followerDigest}`).send({});

    const trigger4 = await triggerEvent({
      customVar: 'trigger_4_data',
    });

    // Wait for trigger4 to be merged to trigger3
    await session.awaitRunningJobs(template?._id, false, 1);
    await session.testAgent.delete(`/v1/events/trigger/${trigger4.transactionId}`).send({});

    await session.awaitRunningJobs(template?._id, false, 0);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(4);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
        transactionId: [trigger1.transactionId, trigger2.transactionId, trigger4.transactionId],
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(3);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondFollowerCanceledTrigger = inpAppJobs[1];
    expect(secondFollowerCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(secondFollowerCanceledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondFollowerCanceledTrigger.digest?.events?.length).to.eql(0);

    const thirdTriggerLatestFollower = inpAppJobs[2];
    expect(thirdTriggerLatestFollower.payload.customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.status).to.eql(JobStatusEnum.COMPLETED);
    expect(thirdTriggerLatestFollower.digest?.events?.length).to.eql(1);
    expect(thirdTriggerLatestFollower.digest?.events?.[0].customVar).to.eql('trigger_3_data');

    const fourthMergedTrigger = inpAppJobs[3];
    expect(fourthMergedTrigger.payload.customVar).to.eql('trigger_4_data');
    expect(fourthMergedTrigger.digest?.events?.length).to.eql(0);
    expect(fourthMergedTrigger.status).to.eql(JobStatusEnum.CANCELED);
  });
});
