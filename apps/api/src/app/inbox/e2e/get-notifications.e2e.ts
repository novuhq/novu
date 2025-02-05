import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { MessageRepository, NotificationTemplateEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import {
  ActorTypeEnum,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  StepTypeEnum,
  SystemAvatarIconEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { Novu } from '@novu/api';
import { mapToDto } from '../utils/notification-mapper';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Notifications - /inbox/notifications (GET) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
    template = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for <b>{{firstName}}</b>',
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '/cypress/test-shell/example/test?test-param=true',
            },
          },
          variables: [
            {
              defaultValue: '',
              name: 'firstName',
              required: false,
              type: TemplateVariableTypeEnum.STRING,
            },
          ],
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
  });

  const getNotifications = async ({
    limit = 10,
    offset = 0,
    after,
    tags,
    read,
    archived,
  }: {
    limit?: number;
    after?: string;
    offset?: number;
    tags?: string[];
    read?: boolean;
    archived?: boolean;
  } = {}) => {
    let query = `limit=${limit}`;
    if (after) {
      query += `&after=${after}`;
    }
    if (offset) {
      query += `&offset=${offset}`;
    }
    if (tags) {
      query += tags.map((tag) => `&tags[]=${tag}`).join('');
    }
    if (typeof read !== 'undefined') {
      query += `&read=${read}`;
    }
    if (typeof archived !== 'undefined') {
      query += `&archived=${archived}`;
    }

    return await session.testAgent
      .get(`/v1/inbox/notifications?${query}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(
        novuClient.trigger({
          workflowId: templateToTrigger.triggers[0].identifier,
          to: { subscriberId: session.subscriberId },
        })
      );
    }

    await Promise.all(promises);
    await session.awaitRunningJobs(templateToTrigger._id);
  };

  const removeUndefinedDeep = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;

    const newObj = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefinedDeep(obj[key]);
      }
    }

    return newObj;
  };

  it('should validate that the offset is greater or equals to zero', async function () {
    const { body, status } = await getNotifications({ limit: 1, offset: -1 });

    expect(status).to.equal(400);
    expect(body.message[0]).to.equal('offset must not be less than 0');
  });

  it('should validate the after to mongo id', async function () {
    const { body, status } = await getNotifications({ limit: 1, after: 'after' });

    expect(status).to.equal(400);
    expect(body.message[0]).to.equal('The after cursor must be a valid MongoDB ObjectId');
  });

  it('should throw exception when filtering for unread and archived notifications', async function () {
    await triggerEvent(template);

    const { body, status } = await getNotifications({ limit: 1, read: false, archived: true });

    expect(status).to.equal(400);
    expect(body.message).to.equal('Filtering for unread and archived notifications is not supported.');
  });

  it('should include fields from message entity', async function () {
    await triggerEvent(template);

    const { data: messages } = await messageRepository.paginate(
      {
        environmentId: session.environment._id,
        subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { limit: 1, offset: 0 }
    );
    const [messageEntity] = messages;
    if (!messageEntity) {
      throw new Error('Message entity not found');
    }

    const { body, status } = await getNotifications({ limit: 1 });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.hasMore).to.be.false;
    expect(body.data[0]).to.deep.equal(removeUndefinedDeep(mapToDto(messageEntity)));
  });

  it('should paginate notifications by offset', async function () {
    const limit = 2;
    await triggerEvent(template, 4);

    const { body, status } = await getNotifications({ limit });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(limit);
    expect(new Date(body.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(body.data[1].createdAt).getTime()
    );
    expect(body.hasMore).to.be.true;

    const { body: nextPageBody, status: nextPageStatus } = await getNotifications({ limit, offset: 2 });

    expect(nextPageStatus).to.equal(200);
    expect(nextPageBody.data).to.be.ok;
    expect(nextPageBody.data.length).to.eq(limit);
    expect(new Date(nextPageBody.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(nextPageBody.data[1].createdAt).getTime()
    );
    expect(nextPageBody.hasMore).to.be.false;
  });

  it('should paginate notifications with after as id', async function () {
    const limit = 2;
    await triggerEvent(template, 4);

    const { body, status } = await getNotifications({ limit });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(limit);
    expect(new Date(body.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(body.data[1].createdAt).getTime()
    );
    expect(body.hasMore).to.be.true;

    const { body: nextPageBody, status: nextPageStatus } = await getNotifications({ limit, after: body.data[1].id });

    expect(nextPageStatus).to.equal(200);
    expect(nextPageBody.data).to.be.ok;
    expect(nextPageBody.data.length).to.eq(limit);
    expect(new Date(nextPageBody.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(nextPageBody.data[1].createdAt).getTime()
    );
    expect(nextPageBody.hasMore).to.be.false;
  });

  it('should filter notifications by tags', async function () {
    const tags = ['newsletter'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, 4);

    const limit = 4;
    const { body, status } = await getNotifications({ limit, tags });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(limit);
    expect(new Date(body.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(body.data[1].createdAt).getTime()
    );
    expect(body.hasMore).to.be.false;
  });

  it('should filter by read', async function () {
    await triggerEvent(template, 4);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { read: true } }
    );

    const limit = 4;
    const { body, status } = await getNotifications({ limit, read: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(limit);
    expect(new Date(body.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(body.data[1].createdAt).getTime()
    );
    expect(body.hasMore).to.be.false;
    expect(body.data.every((message) => message.isRead)).to.be.true;
  });

  it('should filter by archived', async function () {
    await triggerEvent(template, 4);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { archived: true } }
    );

    const limit = 4;
    const { body, status } = await getNotifications({ limit, archived: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(limit);
    expect(new Date(body.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(body.data[1].createdAt).getTime()
    );
    expect(body.hasMore).to.be.false;
    expect(body.data.every((message) => message.isArchived)).to.be.true;
  });

  it('should filter by archived with pagination', async function () {
    await triggerEvent(template, 4);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { archived: true } }
    );

    const limit = 2;
    const { body: firstPageBody, status: firstPageStatus } = await getNotifications({ limit, archived: true });

    expect(firstPageStatus).to.equal(200);
    expect(firstPageBody.data).to.be.ok;
    expect(firstPageBody.data.length).to.eq(limit);
    expect(new Date(firstPageBody.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(firstPageBody.data[1].createdAt).getTime()
    );
    expect(firstPageBody.hasMore).to.be.true;
    expect(firstPageBody.data.every((message) => message.isArchived)).to.be.true;

    const { body: secondPageBody, status: secondPageStatus } = await getNotifications({
      limit,
      after: firstPageBody.data[1].id,
      archived: true,
    });

    expect(secondPageStatus).to.equal(200);
    expect(secondPageBody.data).to.be.ok;
    expect(secondPageBody.data.length).to.eq(limit);
    expect(new Date(secondPageBody.data[0].createdAt).getTime()).to.be.greaterThanOrEqual(
      new Date(secondPageBody.data[1].createdAt).getTime()
    );
    expect(secondPageBody.hasMore).to.be.false;
    expect(secondPageBody.data.every((message) => message.isArchived)).to.be.true;
  });
});
