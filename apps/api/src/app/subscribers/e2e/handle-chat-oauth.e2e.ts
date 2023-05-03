import { expect } from 'chai';
import axios from 'axios';
import * as sinon from 'sinon';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { SubscriberRepository } from '@novu/dal/';

const axiosInstance = axios.create();

describe('HandleChatOauth - /:subscriberId/:providerId/:environmentId (GET)', function () {
  let session: UserSession;
  const ACTION = '<script>window.close();</script>';

  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return action script', async () => {
    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    const res = await handleChat(session.serverUrl, userSubscriberId, session.environment._id);

    expect(res.data).to.be.equal(ACTION);
  });

  it('should throw an exception when looking for integration with invalid environmentId', async () => {
    const data = { incoming_webhook: { url: 'https://hooks.stub-slack.com/services/111/222/333' } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const invalidEnvironment = SubscriberRepository.createObjectId();

    try {
      await handleChat(session.serverUrl, session.subscriberId, invalidEnvironment);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      const errorMessage =
        `Integration in environment ${invalidEnvironment} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
        `providerId: ${ChatProviderIdEnum.Slack}`;
      expect(e.response.data.message).to.contains(errorMessage);
    }
  });

  it('should create a new subscriber and update the subscriber channel', async () => {
    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    await handleChat(session.serverUrl, userSubscriberId, session.environment._id);

    const subscriber = await subscriberRepository.findOne({
      _environmentId: session.environment._id,
      subscriberId: userSubscriberId,
    });

    expect(subscriber).to.exist;
    expect(subscriber?.subscriberId).to.be.equal(userSubscriberId);
    expect(subscriber?.channels?.[0]).to.exist;
    expect(subscriber?.channels?.[0].credentials.webhookUrl).to.be.equal(slackWebhook);
    expect(subscriber?.channels?.[0].credentials.channel).to.be.equal(ChatProviderIdEnum.Slack);
  });

  it('should throw an exception when res.data.ok is false', async () => {
    const data = {
      ok: false,
      error: 'some error',
      response_metadata: {
        messages: ['message1', 'message2'],
      },
    };

    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    try {
      await handleChat(session.serverUrl, session.subscriberId, session.environment._id);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      expect(e.response.data.message).to.equal(
        `Provider slack returned error ${data.error}, metadata:${data?.response_metadata?.messages?.join(', ')}`
      );
    }
  });

  it('should throw an exception when subscriber is invalid', async () => {
    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    try {
      await handleChat(session.serverUrl, null, session.environment._id);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      expect(e.response.data.message[0]).to.equal('subscriberId should not be null');
    }

    try {
      await handleChat(session.serverUrl, 'null', session.environment._id);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      expect(e.response.data.message[0]).to.equal('subscriberId should not be null');
    }

    try {
      await handleChat(session.serverUrl, undefined, session.environment._id);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      expect(e.response.data.message[0]).to.equal('subscriberId should not be undefined');
    }

    try {
      await handleChat(session.serverUrl, 'undefined', session.environment._id);
      throw new Error('Exception should have been thrown');
    } catch (e) {
      expect(e.response.data.message[0]).to.equal('subscriberId should not be undefined');
    }
  });
});

async function handleChat(
  serverUrl: string,
  subscriberId?: string | null,
  environmentId?: string | null | undefined,
  providerId: ChatProviderIdEnum | null = ChatProviderIdEnum.Slack
) {
  return await axiosInstance.get(
    `${serverUrl}/v1/subscribers/${subscriberId}/${providerId}/${environmentId}?code=code_123`
  );
}
