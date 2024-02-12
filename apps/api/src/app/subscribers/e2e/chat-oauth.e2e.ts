import { expect } from 'chai';
import axios from 'axios';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';

const axiosInstance = axios.create();

describe('ChatOauth - /:subscriberId/credentials/:providerId/:environmentId (GET)', function () {
  let session: UserSession;
  const ACTION = '<script>window.close();</script>';

  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw exception on missing credentials', async () => {
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
          credentials: {},
        },
      }
    );

    const userSubscriberId = '123';
    await expectThrow({
      subscriberId: userSubscriberId,
      error: `Integration in environment ${session.environment._id} missing credentials, channel: chat, providerId: slack`,
    });
  });

  it('should throw exception om missing client id', async () => {
    const integrationId = await integrationRepository.findOne(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
      },
      '_id'
    );

    const userSubscriberId = '123';
    await expectThrow({
      subscriberId: userSubscriberId,
      error: `Integration in environment ${session.environment._id} missing clientId, channel: chat, providerId: slack`,
    });
  });

  it('should throw an exception when looking for integration with invalid environmentId', async () => {
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
          'credentials.clientId': '123',
          'credentials.hmac': true,
        },
      }
    );

    await expectThrow({
      subscriberId: '123',
      error: 'Hmac is enabled on the integration, please provide a HMAC hash on the request params',
    });
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
          'credentials.clientId': '123',
          'credentials.hmac': true,
        },
      }
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
    const expectedError = `Exception should have been thrown expect error: ${error}`;
    try {
      await chatOauth(session.serverUrl, subscriberId, environmentId, ChatProviderIdEnum.Slack, hashHmac);
      throw new Error(expectedError);
    } catch (e) {
      const message = Array.isArray(e.response.data.message) ? e.response.data.message[0] : e.response.data.message;
      expect(message || e.message).to.equal(error);
    }
  }
});

async function chatOauth(
  serverUrl: string,
  subscriberId?: string | null,
  environmentId?: string | null | undefined,
  providerId: ChatProviderIdEnum | null = ChatProviderIdEnum.Slack,
  hmacHash = ''
) {
  const environmentIdQuery = `environmentId=${environmentId}`;
  const hmacHashQuery = hmacHash ? `&hmacHash=${hmacHash}` : '';

  return await axiosInstance.get(
    `${serverUrl}/v1/subscribers/${subscriberId}/credentials/${providerId}/oauth?${environmentIdQuery}${hmacHashQuery}`
  );
}
