import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { updateSubscriberPreference } from './update-subscriber-preference.e2e';
import { ChannelTypeEnum } from '@novu/stateless';

describe('GET /widget/preferences', function () {
  let template: NotificationTemplateEntity;
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should fetch a default user preference', async function () {
    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data[0];

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });

  it('should fetch according to template preferences defaults ', async function () {
    const templateDefaultSettings = await session.createTemplate({
      preferenceSettingsOverride: { email: true, chat: true, push: true, sms: true, in_app: false },
      noFeedId: true,
    });
    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data.find((pref) => pref.template._id === templateDefaultSettings._id);

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(false);
  });

  it('should fetch according to merged subscriber and template preferences ', async function () {
    const templateDefaultSettings = await session.createTemplate({
      preferenceSettingsOverride: { email: true, chat: true, push: true, sms: true, in_app: false },
      noFeedId: true,
    });

    const updateDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updateSubscriberPreference(updateDataEmailFalse, session.subscriberToken, templateDefaultSettings._id);

    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data.find((pref) => pref.template._id === templateDefaultSettings._id);

    expect(data.preference.channels.email).to.equal(false);
    expect(data.preference.channels.in_app).to.equal(false);
  });
});

export async function getSubscriberPreference(subscriberToken: string) {
  return await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/preferences`, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
