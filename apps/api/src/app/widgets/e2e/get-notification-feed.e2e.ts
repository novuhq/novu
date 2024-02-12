import axios from 'axios';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('GET /widget/notifications/feed', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let subscriberToken: string;
  let subscriberProfile: {
    _id: string;
  } | null = null;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();

    template = await session.createTemplate({
      noFeedId: true,
    });

    const { body } = await session.testAgent.post('/v1/widgets/session/initialize').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });

    expect(body).to.be.ok;
    expect(body.data).to.be.ok;

    const { token, profile } = body.data;

    subscriberToken = token;
    subscriberProfile = profile;
  });

  it('should fetch a feed without filters and with feed id', async function () {
    /**
     * This test help preventing accidental passing `null` as a feed id which causes
     * the feed to be fetched with explicit null as a property of feedId.
     *
     * This test will fail if the feedId is not passed as a query parameter,
     * but the null query still was applied mistakenly
     */
    template = await session.createTemplate();

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const response = await getSubscriberFeed();
    expect(response.data.length).to.equal(2);
  });

  it('should fetch a feed without filters', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const response = await getSubscriberFeed();
    expect(response.data.length).to.equal(2);
  });

  it('should filter only unseen messages', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile?._id as string,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await markMessageAsSeen(messageId);

    const seenFeed = await getSubscriberFeed({ seen: true });
    expect(seenFeed.data.length).to.equal(1);
    expect(seenFeed.data[0]._id).to.equal(messageId);

    const unseenFeed = await getSubscriberFeed({ seen: false });
    expect(unseenFeed.data.length).to.equal(1);
    expect(unseenFeed.data[0]._id).to.not.equal(messageId);
  });

  it('should return seen and unseen', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile?._id as string,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await markMessageAsSeen(messageId);

    const seenFeed = await getSubscriberFeed({ seen: true });
    expect(seenFeed.data.length).to.equal(1);
    expect(seenFeed.data[0]._id).to.equal(messageId);

    const unseenFeed = await getSubscriberFeed({ seen: false });
    expect(unseenFeed.data.length).to.equal(1);
    expect(unseenFeed.data[0]._id).to.not.equal(messageId);

    const seenUnseenFeed = await getSubscriberFeed();
    expect(seenUnseenFeed.data.length).to.equal(2);
  });

  it('should include subscriber object', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const feed = await getSubscriberFeed();

    expect(feed.data[0]).to.be.an('object').that.has.any.keys('subscriber');
  });

  it('should include hasMore when there is more notification', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    let feed = await getSubscriberFeed();

    expect(feed.data.length).to.be.equal(1);
    expect(feed.totalCount).to.be.equal(1);
    expect(feed.hasMore).to.be.equal(false);

    for (let i = 0; i < 10; i++) {
      await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    }

    await session.awaitRunningJobs(template._id);

    feed = await getSubscriberFeed();

    expect(feed.data.length).to.be.equal(10);
    expect(feed.totalCount).to.be.equal(10);
    expect(feed.hasMore).to.be.equal(true);
  });

  it('should throw exception when invalid payload query param is passed', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    try {
      await getSubscriberFeed({ payload: 'invalid' });
    } catch (err) {
      expect(err.response.status).to.equals(400);
      expect(err.response.data.message).to.eq(`Invalid payload, the JSON object should be encoded to base64 string.`);

      return;
    }

    expect.fail('Should have thrown an bad request exception');
  });

  it('should allow filtering by custom data from the payload', async function () {
    const partialPayload = { foo: 123 };
    const payload = { ...partialPayload, bar: 'bar' };

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.awaitRunningJobs(template._id);

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, payload);
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = await getSubscriberFeed({ payload: payloadQueryValue });

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });

  it('should allow filtering by custom nested data from the payload', async function () {
    const partialPayload = { foo: { bar: 123 } };
    const payload = { ...partialPayload, baz: 'baz' };

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.awaitRunningJobs(template._id);

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, payload);
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = await getSubscriberFeed({ payload: payloadQueryValue });

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });

  async function getSubscriberFeed(query = {}) {
    const response = await axios.get(`http://127.0.0.1:${process.env.PORT}/v1/widgets/notifications/feed`, {
      params: {
        page: 0,
        ...query,
      },
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    return response.data;
  }

  async function markMessageAsSeen(messageId: string) {
    return await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );
  }
});
