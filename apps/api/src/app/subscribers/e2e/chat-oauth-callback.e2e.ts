import { expect } from 'chai';
import axios from 'axios';
import sinon from 'sinon';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('ChatOauthCallback - /:subscriberId/credentials/:providerId/:environmentId/callback (GET) #novu-v2', function () {
  let session: UserSession;
  const HTML_SCRIPT = '<script>window.close();</script>';

  const integrationRepository = new IntegrationRepository();
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
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

    const res = await novuClient.subscribers.authentication.chatAccessOauthCallBack(
      {
        code: 'code_123',
        subscriberId: userSubscriberId,
        providerId: ChatProviderIdEnum.Slack,
        environmentId: session.environment._id,
        hmacHash: '',
      },
      { retries: { strategy: 'none' } }
    );

    expect(res.result).to.be.equal(HTML_SCRIPT);
  });

  it('should throw an exception when looking for integration with invalid environmentId', async () => {
    const data = { incoming_webhook: { url: 'https://hooks.stub-slack.com/services/111/222/333' } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const invalidEnvironment = SubscriberRepository.createObjectId();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauthCallBack({
        code: 'code_123',
        subscriberId: session.subscriberId,
        providerId: ChatProviderIdEnum.Slack,
        environmentId: invalidEnvironment,
        hmacHash: '',
      })
    );
    await expect(error?.message).to.equal(
      `Integration in environment ${invalidEnvironment} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
        `providerId: ${ChatProviderIdEnum.Slack}`
    );
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

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauthCallBack({
        code: 'code_123',
        subscriberId: '123',
        providerId: ChatProviderIdEnum.Slack,
        environmentId: session.environment._id,
        hmacHash: '',
      })
    );
    await expect(error?.message).to.equal(
      `Hmac is enabled on the integration, please provide a HMAC hash on the request params`
    );
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

    const res = await novuClient.subscribers.authentication.chatAccessOauthCallBack({
      code: 'code_123',
      subscriberId: userSubscriberId,
      providerId: ChatProviderIdEnum.Slack,
      environmentId: session.environment._id,
      hmacHash,
    });

    expect(res.result).to.be.equal(HTML_SCRIPT);
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

    const invalidHmac = `${hmacHash}007`;

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauthCallBack({
        code: 'code_123',
        subscriberId: userSubscriberId,
        providerId: ChatProviderIdEnum.Slack,
        environmentId: session.environment._id,
        hmacHash: invalidHmac,
      })
    );
    await expect(error?.message).to.equal(`Hmac is enabled on the integration, please provide a valid HMAC hash`);
  });

  it('should throw exception on missing webhook', async () => {
    const data = { incoming_webhook: { url: undefined } };
    sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data,
      })
    );

    const userSubscriberId = '123';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.authentication.chatAccessOauthCallBack({
        code: 'code_123',
        subscriberId: userSubscriberId,
        providerId: ChatProviderIdEnum.Slack,
        environmentId: session.environment._id,
        hmacHash: '',
      })
    );
    await expect(error?.message).to.equal(`Provider slack did not return a webhook url`);
  });
});
