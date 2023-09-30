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

import { getNotificationTemplate, updateNotificationTemplate, getPreference, updatePreference } from './helpers';

describe('Update Subscribers preferences - /subscribers/:subscriberId/preferences/:templateId (PATCH)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should send a Bad Request error if channel property in payload is not right', async function () {
    const updateDataEmailFalse = {
      channel: ChannelTypeEnum.EMAIL,
      enabled: false,
    };

    try {
      const response = await updatePreference(updateDataEmailFalse as any, session, template._id);
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
      channel: {
        type: ChannelTypeEnum.EMAIL,
      },
      enabled: 2,
    };

    try {
      const response = await updatePreference(updateDataEmailFalse as any, session, template._id);
      expect(response).to.not.be;
    } catch (error) {
      expect(error.toJSON()).to.have.include({
        status: 400,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      });
    }
  });

  it('should send a Not Found Request error if template id is wrong', async function () {
    const updateDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    try {
      const response = await updatePreference(updateDataEmailFalse as any, session, '63cc6e0b561e0a609f223e27');
      expect(response).to.not.be;
    } catch (error) {
      const { response } = error;
      expect(response.status).to.eql(404);
      expect(response.data).to.have.include({
        statusCode: 404,
        message: 'Template with id 63cc6e0b561e0a609f223e27 is not found',
        error: 'Not Found',
      });
    }
  });

  it('should not do any action or error when sending an empty channels property', async function () {
    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const emptyPreferenceData = {
      channels: {},
    };

    await updatePreference(emptyPreferenceData as any, session, template._id);

    const preferences = (await getPreference(session)).data.data[0];

    expect(preferences.preference.enabled).to.eql(true);
    expect(preferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should update user preference and disable the flag for the future general notification template preference', async function () {
    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const disablePreferenceData = {
      enabled: false,
    };

    await updatePreference(disablePreferenceData, session, template._id);

    const midwayPreferences = (await getPreference(session)).data.data[0];
    expect(midwayPreferences.preference.enabled).to.eql(false);
    expect(midwayPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const updateEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updatePreference(updateEmailPreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(false);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: false,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should update user preference and enable the flag for the future general notification template preference', async function () {
    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const disablePreferenceData = {
      enabled: false,
    };

    await updatePreference(disablePreferenceData, session, template._id);

    const midwayPreferences = (await getPreference(session)).data.data[0];
    expect(midwayPreferences.preference.enabled).to.eql(false);
    expect(midwayPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const enablePreferenceData = {
      enabled: true,
    };

    await updatePreference(enablePreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should be able to update the subscriber preference for an active channel of the template', async function () {
    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const disableEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updatePreference(disableEmailPreferenceData, session, template._id);

    const updatedPreferences = (await getPreference(session)).data.data[0];
    expect(updatedPreferences.preference.enabled).to.eql(true);
    expect(updatedPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: false,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const enableEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: true,
      },
    };

    await updatePreference(enableEmailPreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should ignore the channel update if channel not being used in the notification template', async function () {
    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.SMS,
        enabled: false,
      },
    };

    await updatePreference(updateSmsPreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });

  it('should be able to modify a channel preference after it being added as step in a notification template', async function () {
    const notificationTemplateResponse = await getNotificationTemplate(session, template._id);
    const body = notificationTemplateResponse.data.data;
    const { steps } = body;

    const updatedSteps = [
      ...steps,
      {
        template: {
          type: StepTypeEnum.SMS,
          content: 'This is new content for in app notification',
        },
      },
    ];
    const updateData: IUpdateNotificationTemplateDto = {
      steps: updatedSteps,
    };
    const updatedNotificationTemplateResponse = await updateNotificationTemplate(session, template._id, updateData);

    const updatedNotificationTemplate = (await getNotificationTemplate(session, template._id)).data.data;
    expect(updatedNotificationTemplate.steps.length).to.eql(3);

    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
      [ChannelTypeEnum.SMS]: true,
    });

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.SMS,
        enabled: false,
      },
    };

    await updatePreference(updateSmsPreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
      [ChannelTypeEnum.SMS]: false,
    });
  });

  it('should have no problems with a digest step in the notification template', async function () {
    const notificationTemplateResponse = await getNotificationTemplate(session, template._id);
    const body = notificationTemplateResponse.data.data;
    const { steps } = body;

    const updatedSteps = [
      {
        template: {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
      },
      ...steps,
    ];
    const updateData: IUpdateNotificationTemplateDto = {
      steps: updatedSteps,
    };

    await updateNotificationTemplate(session, template._id, updateData);

    const updatedNotificationTemplate = (await getNotificationTemplate(session, template._id)).data.data;
    expect(updatedNotificationTemplate.steps.length).to.eql(3);

    const initialPreferences = (await getPreference(session)).data.data[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: true,
      [ChannelTypeEnum.IN_APP]: true,
    });

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updatePreference(updateSmsPreferenceData, session, template._id);

    const finalPreferences = (await getPreference(session)).data.data[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      [ChannelTypeEnum.EMAIL]: false,
      [ChannelTypeEnum.IN_APP]: true,
    });
  });
});
