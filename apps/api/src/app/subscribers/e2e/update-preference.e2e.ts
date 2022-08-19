import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { NotificationTemplateEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { getPreference } from './get-preferences.e2e';
import { UpdateSubscriberPreferenceRequestDto } from '../../widgets/dtos/update-subscriber-preference-request.dto';

const axiosInstance = axios.create();

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

  it('should update user preference', async function () {
    const createData = {
      enabled: true,
    };

    await updatePreference(createData, session, template._id);

    const updateDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updatePreference(updateDataEmailFalse, session, template._id);

    const response = (await getPreference(session)).data.data[0];

    expect(response.preference.enabled).to.equal(true);
    expect(response.preference.channels.email).to.equal(false);
  });
});

async function updatePreference(data: UpdateSubscriberPreferenceRequestDto, session: UserSession, templateId: string) {
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
