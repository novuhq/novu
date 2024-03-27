import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';
import { UpdateSubscriberPreferenceRequestDto } from '../dtos/update-subscriber-preference-request.dto';
import { getSubscriberPreference } from './get-subscriber-preference.e2e';

describe('PATCH /widgets/preferences/:templateId', function () {
  let template: NotificationTemplateEntity;
  let session: UserSession;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();

    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should create user preference', async function () {
    const updateData = {
      enabled: false,
    };

    await updateSubscriberPreference(updateData, session.subscriberToken, template._id);

    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data[0];

    expect(data.preference.enabled).to.equal(false);
    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });

  it('should update user preference', async function () {
    const createData = {
      enabled: true,
    };

    await updateSubscriberPreference(createData, session.subscriberToken, template._id);

    const updateDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    const response = (await updateSubscriberPreference(updateDataEmailFalse, session.subscriberToken, template._id))
      .data.data;

    expect(response.preference.enabled).to.equal(true);
    expect(response.preference.channels.email).to.equal(false);
    expect(response.preference.channels.in_app).to.equal(true);
    expect(response.preference.channels.sms).to.be.not.ok;
    expect(response.preference.channels.chat).to.be.not.ok;
  });

  it(
    'should not update empty object should throw exception if ' +
      'no channel and not template enable param - user preference',
    async function () {
      const createData = {
        templateId: template._id,
        enabled: true,
      };

      await updateSubscriberPreference(createData, session.subscriberToken, template._id);

      const updateDataEmailFalse = {
        channel: {},
      } as UpdateSubscriberPreferenceRequestDto;

      let responseMessage = '';
      try {
        await updateSubscriberPreference(updateDataEmailFalse, session.subscriberToken, template._id);
      } catch (e) {
        responseMessage = 'In order to make an update you need to provider channel or enabled';
      }

      expect(responseMessage).to.equal('In order to make an update you need to provider channel or enabled');
    }
  );

  it('should override template preference defaults after subscriber update', async function () {
    const templateDefaultSettings = await session.createTemplate({
      preferenceSettingsOverride: { email: false, chat: true, push: true, sms: true, in_app: true },
      noFeedId: true,
    });

    const updateEmailEnable = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: true,
      },
    };

    const response = (
      await updateSubscriberPreference(updateEmailEnable, session.subscriberToken, templateDefaultSettings._id)
    ).data.data;

    expect(response.preference.enabled).to.equal(true);
    expect(response.preference.channels.email).to.equal(true);
    expect(response.preference.channels.in_app).to.equal(true);
  });
});

export async function updateSubscriberPreference(
  data: UpdateSubscriberPreferenceRequestDto,
  subscriberToken: string,
  templateId: string
) {
  return await axios.patch(`http://127.0.0.1:${process.env.PORT}/v1/widgets/preferences/${templateId}`, data, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
