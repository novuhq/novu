import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  IUpdateNotificationTemplateDto,
  StepTypeEnum,
} from '@novu/shared';

import { getNotificationTemplate, updateNotificationTemplate, getPreference, updateGlobalPreferences } from './helpers';

describe('Update Subscribers global preferences - /subscribers/:subscriberId/preferences (PATCH)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should send a Bad Request error if preferences property in payload is not right', async function () {
    const updateDataEmailFalse = {
      preferences: [
        {
          type: ChannelTypeEnum.EMAIL,
          enabled: 10,
        },
      ],
      enabled: false,
    };

    try {
      const response = await updateGlobalPreferences(updateDataEmailFalse as any, session);
      expect(response).to.not.be;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }
  });

  it('should send a Bad Request error if enabled property in payload is not right', async function () {
    const updateDataEmailFalse = {
      preferences: [
        {
          type: ChannelTypeEnum.EMAIL,
          enabled: false,
        },
      ],
      enabled: 2,
    };

    try {
      const response = await updateGlobalPreferences(updateDataEmailFalse as any, session);
      expect(response).to.not.be;
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

    expect(response.data.preference.enabled).to.eql(false);
    expect(response.data.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
    });
  });

  it('should update user global preference and disable the flag for the future channels update', async function () {
    const disablePreferenceData = {
      enabled: false,
    };

    const response = await updateGlobalPreferences(disablePreferenceData, session);

    expect(response.data.preference.enabled).to.eql(false);

    const preferenceChannel = {
      preferences: [{ type: ChannelTypeEnum.EMAIL, enabled: true }],
    };

    const res = await updateGlobalPreferences(disablePreferenceData, session);

    expect(res.data.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
    });
  });
});
