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
import axios from 'axios';
import { Novu } from '@novu/api';
import { UpdateSubscriberPreferenceRequestDto } from '@novu/api/models/components';
import { PreferenceChannels } from '@novu/api/src/models/components/preferencechannels';
import { getNotificationTemplate, updateNotificationTemplate } from './helpers';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const axiosInstance = axios.create();

describe('Update Subscribers preferences - /subscribers/:subscriberId/preferences/:templateId (PATCH) #novu-v2', function () {
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

  it('should send a Bad Request error if channel property in payload is not right', async function () {
    const updateDataEmailFalse = {
      channel: ChannelTypeEnum.EMAIL,
      enabled: false,
    };

    try {
      const response = await updatePreference(updateDataEmailFalse as any, session, template._id);
      expect(response).to.not.be.ok;
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
      expect(response).to.not.be.ok;
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

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.updateLegacy({
        workflowId: '63cc6e0b561e0a609f223e27',
        subscriberId: session.subscriberId,
        updateSubscriberPreferenceRequestDto: updateDataEmailFalse as any,
      })
    );
    expect(error?.statusCode).to.eql(404);
    expect(error?.message).to.eql('Workflow with id: 63cc6e0b561e0a609f223e27 is not found');
  });

  it('should fail on invalid "enabled" param (string)', async function () {
    const updatePreferenceDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: '',
      },
    };

    try {
      const response = await updatePreference(updatePreferenceDataEmailFalse as any, session, template._id);
      expect(response).to.not.be.ok;
    } catch (error) {
      const { response } = error;
      expect(response.status).to.eql(400);
      expect(response.data.message[0], JSON.stringify(response.data)).to.be.equal(
        'channel.enabled must be a boolean value'
      );
    }

    const updatePreferencesDataEmailFalse = {
      preferences: [
        {
          type: ChannelTypeEnum.EMAIL,
          enabled: '',
        },
      ],
    };

    try {
      const response = await updatePreferences(updatePreferencesDataEmailFalse as any, session);
      expect(response).to.not.be.ok;
    } catch (error) {
      const { response } = error;
      expect(response.status).to.eql(400);
      expect(response.data.message[0], JSON.stringify(response.data, null, 2)).to.be.equal(
        'preferences.0.enabled must be a boolean value'
      );
    }
  });

  it('should not do any action or error when sending an empty channels property', async function () {
    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const emptyPreferenceData = {
      channels: {},
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: emptyPreferenceData as any,
    });

    const preferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];

    expect(preferences.preference.enabled).to.eql(true);
    expect(preferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);
  });

  // `enabled` flag is not used anymore. The presence of a preference object means that the subscriber has enabled notifications.
  it.skip('should update user preference and disable the flag for the future general notification template preference', async function () {
    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const disablePreferenceData = {
      enabled: false,
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: disablePreferenceData,
    });

    const midwayPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(midwayPreferences.preference.enabled).to.eql(false);
    expect(midwayPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const updateEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: updateEmailPreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(false);
    expect(finalPreferences.preference.channels).to.eql({
      email: false,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);
  });

  // `enabled` flag is not used anymore. The presence of a preference object means that the subscriber has enabled notifications.
  it.skip('should update user preference and enable the flag for the future general notification template preference', async function () {
    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const disablePreferenceData = {
      enabled: false,
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: disablePreferenceData,
    });

    const midwayPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(midwayPreferences.preference.enabled).to.eql(false);
    expect(midwayPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const enablePreferenceData = {
      enabled: true,
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: enablePreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);
  });

  it('should be able to update the subscriber preference for an active channel of the template', async function () {
    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const disableEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: disableEmailPreferenceData,
    });

    const updatedPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(updatedPreferences.preference.enabled).to.eql(true);
    expect(updatedPreferences.preference.channels).to.eql({
      email: false,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const enableEmailPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: true,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: enableEmailPreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);
  });

  it('should ignore the channel update if channel not being used in the notification template', async function () {
    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.SMS,
        enabled: false,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: updateSmsPreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: false,
    } as PreferenceChannels);
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
    await updateNotificationTemplate(session, template._id, updateData);

    const updatedNotificationTemplate = (await getNotificationTemplate(session, template._id)).data.data;
    expect(updatedNotificationTemplate.steps.length).to.eql(3);

    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      sms: true,
      push: true,
      chat: true,
    } as PreferenceChannels);

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.SMS,
        enabled: false,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: updateSmsPreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      sms: false,
      push: true,
      chat: true,
    } as PreferenceChannels);
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

    const initialPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(initialPreferences.preference.enabled).to.eql(true);
    expect(initialPreferences.preference.channels).to.eql({
      email: true,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);

    const updateSmsPreferenceData = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await novuClient.subscribers.preferences.updateLegacy({
      workflowId: template._id,
      subscriberId: session.subscriberId,
      updateSubscriberPreferenceRequestDto: updateSmsPreferenceData,
    });

    const finalPreferences = (await novuClient.subscribers.preferences.list(session.subscriberId)).result[0];
    expect(finalPreferences.preference.enabled).to.eql(true);
    expect(finalPreferences.preference.channels).to.eql({
      email: false,
      inApp: true,
      push: true,
      chat: true,
      sms: true,
    } as PreferenceChannels);
  });
});
export async function updatePreference(
  data: UpdateSubscriberPreferenceRequestDto,
  session: UserSession,
  templateId: string
) {
  return await axiosInstance.patch(
    `${session.serverUrl}/v1/subscribers/${session.subscriberId}/preferences/${templateId}`,
    data,
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
export async function updatePreferences(data: UpdateSubscriberPreferenceRequestDto, session: UserSession) {
  return await axiosInstance.patch(`${session.serverUrl}/v1/subscribers/${session.subscriberId}/preferences`, data, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
