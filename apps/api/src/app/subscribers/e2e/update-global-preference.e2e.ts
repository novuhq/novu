import { ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { updateGlobalPreferences } from './helpers';

describe('Update Subscribers global preferences - /subscribers/:subscriberId/preferences (PATCH)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update user global preferences', async function () {
    const payload = {
      enabled: true,
      preferences: [{ type: ChannelTypeEnum.EMAIL, enabled: true }],
    };

    const response = await updateGlobalPreferences(payload, session);

    expect(response.data.data.preference.enabled).to.eql(true);
    expect(response.data.data.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
    });
  });

  it('should update user global preference and disable the flag for the future channels update', async function () {
    const disablePreferenceData = {
      enabled: false,
    };

    const response = await updateGlobalPreferences(disablePreferenceData, session);

    expect(response.data.data.preference.enabled).to.eql(false);

    const preferenceChannel = {
      preferences: [{ type: ChannelTypeEnum.EMAIL, enabled: true }],
    };

    const res = await updateGlobalPreferences(preferenceChannel, session);

    expect(res.data.data.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
    });
  });
});
