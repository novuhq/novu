import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('ChatOauth - /:subscriberId/credentials/:providerId/:environmentId (GET) #novu-v2', function () {
  let session: UserSession;
  let novuClient: Novu;
  const integrationRepository = new IntegrationRepository();
  const userSubscriberId = '123';

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
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

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauth({
        environmentId: session.environment._id,
        hmacHash: '',
        providerId: ChatProviderIdEnum.Slack,
        subscriberId: userSubscriberId || userSubscriberId,
      })
    );
    expect(error?.message).to.equal(
      `Integration in environment ${session.environment._id} missing credentials, channel: chat, providerId: slack`
    );
  });

  it('should throw exception om missing client id', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauth({
        environmentId: session.environment._id,
        hmacHash: '',
        providerId: ChatProviderIdEnum.Slack,
        subscriberId: userSubscriberId || userSubscriberId,
      })
    );
    expect(error?.message).to.equal(
      `Integration in environment ${session.environment._id} missing clientId, channel: chat, providerId: slack`
    );
  });

  it('should throw an exception when looking for integration with invalid environmentId', async () => {
    const invalidEnvironment = SubscriberRepository.createObjectId();

    const errorMessage =
      `Integration in environment ${invalidEnvironment} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
      `providerId: ${ChatProviderIdEnum.Slack}`;
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauth({
        environmentId: invalidEnvironment || session.environment._id,
        hmacHash: '',
        providerId: ChatProviderIdEnum.Slack,
        subscriberId: session.subscriberId || userSubscriberId,
      })
    );
    expect(error?.message).to.equal(errorMessage);
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

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauth({
        environmentId: session.environment._id,
        hmacHash: '',
        providerId: ChatProviderIdEnum.Slack,
        subscriberId: userSubscriberId,
      })
    );
    await expect(error?.message).to.equal(
      'Hmac is enabled on the integration, please provide a HMAC hash on the request params'
    );
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

    const hmacHash = createHash(session.apiKey, userSubscriberId);

    const invalidHmac = `${hmacHash}007`;

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauth({
        environmentId: session.environment._id,
        hmacHash: invalidHmac,
        providerId: ChatProviderIdEnum.Slack,
        subscriberId: userSubscriberId || userSubscriberId,
      })
    );
    await expect(error?.message, JSON.stringify(error)).to.equal(
      'Hmac is enabled on the integration, please provide a valid HMAC hash'
    );
  });
});
