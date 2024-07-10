import { expect } from 'chai';
import axios from 'axios';
import * as sinon from 'sinon';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';

const axiosInstance = axios.create();

describe('ChatOauthCallback - /:subscriberId/credentials/:providerId/:environmentId/callback (GET)', function () {
  let session: UserSession;
  const ACTION = '<script>window.close();</script>';

  const integrationRepository = new IntegrationRepository();

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

    const res = await chatOauthCallback(session.serverUrl, userSubscriberId, session.environment._id);

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

    const errorMessage =
      `Integration in environment ${invalidEnvironment} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
      `providerId: ${ChatProviderIdEnum.Slack}`;
    await expectThrow({
      subscriberId: session.subscriberId,
      error: errorMessage,
      environmentId: invalidEnvironment,
    });
  });

  it('should throw an exception with missing hmacHash (enabled hmac)', async () => {
    const integrationId = await integrationRepository.findOne(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
      },
      '_id'
    );

    await integrationRepository.update(
      { _id: integrationId, _environmentId: session.environment._id },
      {
        $set: {
          'credentials.hmac': true,
        },
      }
    );

    const test = await integrationRepository.findOne({ _id: integrationId, _environmentId: session.environment._id });

    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    await expectThrow({
      subscriberId: '123',
      error: 'Hmac is enabled on the integration, please provide a HMAC hash on the request params',
    });
  });

  it('should return action script (hmac enabled)', async () => {
    const integrationId = await integrationRepository.findOne(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
      },
      '_id'
    );

    await integrationRepository.update(
      { _id: integrationId, _environmentId: session.environment._id },
      {
        $set: {
          'credentials.hmac': true,
        },
      }
    );

    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    const hmacHash = createHash(session.apiKey, userSubscriberId);

    const res = await chatOauthCallback(
      session.serverUrl,
      userSubscriberId,
      session.environment._id,
      ChatProviderIdEnum.Slack,
      hmacHash
    );

    expect(res.data).to.be.equal(ACTION);
  });

  it('should throw exception on invalid hashHmac (hmac enabled)', async () => {
    const integrationId = await integrationRepository.findOne(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
      },
      '_id'
    );

    await integrationRepository.update(
      { _id: integrationId, _environmentId: session.environment._id },
      {
        $set: {
          'credentials.hmac': true,
        },
      }
    );

    const slackWebhook = 'https://hooks.stub-slack.com/services/111/222/333';
    const data = { incoming_webhook: { url: slackWebhook } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    const hmacHash = createHash(session.apiKey, userSubscriberId);

    const invalidHmac = hmacHash + '007';

    await expectThrow({
      subscriberId: userSubscriberId,
      error: 'Hmac is enabled on the integration, please provide a valid HMAC hash',
      hashHmac: invalidHmac,
    });
  });

  it('should throw exception on missing webhook', async () => {
    const data = { incoming_webhook: { url: undefined } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    await expectThrow({
      subscriberId: userSubscriberId,
      error: 'Provider slack did not return a webhook url',
    });
  });

  async function expectThrow({
    subscriberId,
    error,
    environmentId = session.environment._id,
    hashHmac = '',
  }: {
    subscriberId: string | undefined | null;
    error: string;
    environmentId?: string;
    hashHmac?: string;
  }) {
    const expectedError = 'Exception should have been thrown' + ` expect error: ${error}`;
    try {
      await chatOauthCallback(session.serverUrl, subscriberId, environmentId, ChatProviderIdEnum.Slack, hashHmac);
      throw new Error(expectedError);
    } catch (e) {
      const message = Array.isArray(e.response.data.message) ? e.response.data.message[0] : e.response.data.message;
      expect(message || e.message).to.equal(error);
    }
  }
});

async function chatOauthCallback(
  serverUrl: string,
  subscriberId?: string | null,
  environmentId?: string | null | undefined,
  providerId: ChatProviderIdEnum | null = ChatProviderIdEnum.Slack,
  hmacHash = ''
) {
  const environmentIdQuery = `&environmentId=${environmentId}`;
  const hmacHashQuery = hmacHash ? `&hmacHash=${hmacHash}` : '';

  return await axiosInstance.get(
    `${serverUrl}/v1/subscribers/${subscriberId}/credentials/${providerId}/oauth/callback?code=code_123${environmentIdQuery}${hmacHashQuery}`
  );
}
