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

  it('should validate the payload', async function () {
    const badPayload = {
      enabled: true,
      preferences: false,
    };

    try {
      const firstResponse = await updateGlobalPreferences(badPayload as any, session);
      expect(firstResponse).to.not.be.ok;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }

    const yetAnotherBadPayload = {
      enabled: 'hello',
      preferences: [{ type: ChannelTypeEnum.EMAIL, enabled: true }],
    };

    try {
      const secondResponse = await updateGlobalPreferences(yetAnotherBadPayload as any, session);
      expect(secondResponse).to.not.be.ok;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }
  });

  it('should update user global preferences', async function () {
    const payload = {
      enabled: true,
      preferences: [{ type: ChannelTypeEnum.EMAIL, enabled: true }],
    };

    const response = await updateGlobalPreferences(payload, session);

    expect(response.data.data.preference.enabled).to.eql(true);
    expect(response.data.data.preference.channels).to.not.eql({
      [ChannelTypeEnum.IN_APP]: true,
    });
    expect(response.data.data.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.SMS]: true,
      [ChannelTypeEnum.CHAT]: true,
      [ChannelTypeEnum.PUSH]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should update user global preferences for multiple channels', async function () {
    const payload = {
      enabled: true,
      preferences: [
        { type: ChannelTypeEnum.PUSH, enabled: true },
        { type: ChannelTypeEnum.IN_APP, enabled: false },
        { type: ChannelTypeEnum.SMS, enabled: true },
      ],
    };

    const response = await updateGlobalPreferences(payload, session);

    expect(response.data.data.preference.enabled).to.eql(true);
    expect(response.data.data.preference.channels).to.eql({
      [ChannelTypeEnum.PUSH]: true,
      [ChannelTypeEnum.IN_APP]: false,
      [ChannelTypeEnum.SMS]: true,
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.CHAT]: true,
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
      [ChannelTypeEnum.SMS]: true,
      [ChannelTypeEnum.CHAT]: true,
      [ChannelTypeEnum.PUSH]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });
});
