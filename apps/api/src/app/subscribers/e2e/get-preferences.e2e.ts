import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateEntity } from '@novu/dal';

import { PreferenceLevelEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Subscribers workflow preferences - /subscribers/:subscriberId/preferences (GET) #novu-v2', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
    });
    novuClient = initNovuClassSdk(session);
  });

  it('should get subscriber workflow preferences with inactive channels by default', async function () {
    const response = await novuClient.subscribers.preferences.listLegacy(session.subscriberId);
    const data = response.result[0];

    expect(data.preference.channels).to.deep.equal({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    });
  });

  it('should get subscriber workflow preferences with inactive channels when includeInactiveChannels is true', async function () {
    const response = await novuClient.subscribers.preferences.listLegacy(session.subscriberId, true);
    const data = response.result[0];

    expect(data.preference.channels).to.deep.equal({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    });
  });

  it('should get subscriber workflow preferences with active channels when includeInactiveChannels is false', async function () {
    const response = await novuClient.subscribers.preferences.listLegacy(session.subscriberId, false);
    const data = response.result[0];

    expect(data.preference.channels).to.deep.equal({
      email: true,
      inApp: true,
    });
  });

  it('should handle un existing subscriberId', async function () {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.listLegacy('unexisting-subscriber-id')
    );
    expect(error).to.be.ok;
    expect(error?.message).to.contain('not found');
  });
});

describe('Get Subscribers preferences by level - /subscribers/:subscriberId/preferences/:level (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
    });
    novuClient = initNovuClassSdk(session);
  });

  const levels = Object.values(PreferenceLevelEnum);

  levels.forEach((level) => {
    it(`should get subscriber ${level} preferences with inactive channels by default`, async function () {
      const response = await novuClient.subscribers.preferences.retrieveByLevelLegacy({
        preferenceLevel: level,
        subscriberId: session.subscriberId,
      });
      const data = response.result[0];

      expect(data.preference.channels).to.deep.equal({
        email: true,
        inApp: true,
        push: true,
        chat: true,
        sms: true,
      });
    });

    it(`should get subscriber ${level} preferences with inactive channels when includeInactiveChannels is true`, async function () {
      const response = await novuClient.subscribers.preferences.retrieveByLevelLegacy({
        preferenceLevel: level,
        subscriberId: session.subscriberId,
        includeInactiveChannels: {
          includeInactiveChannels: true,
        }.includeInactiveChannels,
      });
      const data = response.result[0];

      expect(data.preference.channels).to.deep.equal({
        email: true,
        inApp: true,
        push: true,
        chat: true,
        sms: true,
      });
    });

    it(`should get subscriber ${level} preferences with active channels when includeInactiveChannels is false`, async function () {
      const response = await novuClient.subscribers.preferences.retrieveByLevelLegacy({
        preferenceLevel: level,
        subscriberId: session.subscriberId,
        includeInactiveChannels: {
          includeInactiveChannels: false,
        }.includeInactiveChannels,
      });
      const data = response.result[0];

      expect(data.preference.channels).to.deep.equal({
        email: true,
        inApp: true,
      });
    });
  });
});
