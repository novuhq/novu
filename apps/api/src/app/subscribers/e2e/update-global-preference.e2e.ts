import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { ChannelTypeEnum } from '@novu/api/models/components';
import { SubscriberRepository } from '@novu/dal';

import { PreferenceChannels } from '@novu/api/src/models/components/preferencechannels';
import { ChannelTypeEnum as ChannelTypeEnumInShared, StepTypeEnum } from '@novu/shared';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update Subscribers global preferences - /subscribers/:subscriberId/preferences (PATCH) #novu-v2', function () {
  let session: UserSession;
  let novuClient: Novu;
  let subscriberRepository: SubscriberRepository;

  beforeEach(async () => {
    session = new UserSession();
    subscriberRepository = new SubscriberRepository();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should validate the payload', async function () {
    const badPayload = {
      enabled: true,
      preferences: false,
    };

    try {
      const firstResponse = await novuClient.subscribers.preferences.legacy.updateGlobal(
        badPayload as any,
        session.subscriberId
      );
      expect(firstResponse).to.not.be.ok;
    } catch (error) {
      expect(error.pretty()).to.contain('Expected array, received boolean');
    }
  });

  it('should update user global preferences', async function () {
    const payload = {
      enabled: true,
      preferences: [{ type: ChannelTypeEnum.Email, enabled: true }],
    };

    const response = await novuClient.subscribers.preferences.legacy.updateGlobal(payload, session.subscriberId);

    expect(response.result.preference.enabled).to.eql(true);
    expect(response.result.preference.channels).to.not.eql({
      [ChannelTypeEnum.InApp]: true,
    });
    expect(response.result.preference.channels).to.eql({
      email: true,
      sms: true,
      inApp: true,
      chat: true,
      push: true,
    } as PreferenceChannels);
  });

  it('should update user global preferences for multiple channels', async function () {
    const payload = {
      enabled: true,
      preferences: [
        { type: ChannelTypeEnum.Push, enabled: false },
        { type: ChannelTypeEnum.InApp, enabled: false },
        { type: ChannelTypeEnum.Sms, enabled: true },
      ],
    };

    const response = await novuClient.subscribers.preferences.legacy.updateGlobal(payload, session.subscriberId);

    expect(response.result.preference.enabled).to.eql(true);
    expect(response.result.preference.channels).to.deep.eq({
      email: true,
      push: false,
      chat: true,
      sms: true,
      inApp: false,
    } as PreferenceChannels);
  });
  it('should update user global preferences only for the current environment', async function () {
    // create a template in dev environment
    await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello',
        },
      ],
      noFeedId: true,
    });

    await session.switchToProdEnvironment();
    // create a subscriber in prod environment
    await subscriberRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      subscriberId: session.subscriberId,
    });
    // create a template in prod environment
    await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello',
        },
      ],
      noFeedId: true,
    });

    await session.switchToDevEnvironment();
    // update the subscriber global preferences in dev environment
    const response = await novuClient.subscribers.preferences.legacy.updateGlobal(
      {
        enabled: true,
        preferences: [{ type: ChannelTypeEnumInShared.IN_APP, enabled: false }],
      },
      session.subscriberId
    );

    expect(response.result.preference.enabled).to.eql(true);
    expect(response.result.preference.channels).to.eql({
      email: true,
      push: true,
      chat: true,
      sms: true,
      inApp: false,
    } as PreferenceChannels);

    // get the subscriber preferences in dev environment
    const getDevPreferencesResponse = await novuClient.subscribers.preferences.listLegacy(session.subscriberId);
    const devPreferences = getDevPreferencesResponse.result;
    expect(devPreferences.every((item) => !!item.preference.channels.inApp)).to.be.false;

    await session.switchToProdEnvironment();

    // get the subscriber preferences in prod environment
    session.apiKey = session.environment.apiKeys[0].key;
    const novuClientForProduction = initNovuClassSdk(session);
    const getProdPreferencesResponse = await novuClientForProduction.subscribers.preferences.listLegacy(
      session.subscriberId
    );
    const prodPreferences = getProdPreferencesResponse.result;
    expect(prodPreferences.every((item) => !!item.preference.channels.inApp)).to.be.true;
  });
});

// This is kept in order to validate the server controller behavior as the SDK will not allow problematic payloads in compilation
