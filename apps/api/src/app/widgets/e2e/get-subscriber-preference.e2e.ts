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

    expect(data.template.name).to.exist;
    expect(data.template.tags[0]).to.equal('test-tag');
    expect(data.template.critical).to.equal(false);
    expect(data.template.triggers[0].identifier).to.contains('test-event-');

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);

    expect(data.preference.overrides.find((sources) => sources.channel === 'email').source).to.equal('template');
    expect(data.preference.overrides.find((sources) => sources.channel === 'email').source).to.equal('template');
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

    expect(data.preference.overrides.find((sources) => sources.channel === 'email').source).to.equal('template');
    expect(data.preference.overrides.find((sources) => sources.channel === 'email').source).to.equal('template');
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

    expect(data.preference.overrides.find((sources) => sources.channel === 'email').source).to.equal('subscriber');
    expect(data.preference.overrides.find((sources) => sources.channel === 'in_app').source).to.equal('template');
  });

  it('should filter not active channels and sources', async function () {
    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data[0];

    expect(Object.keys(data.preference.channels).length).to.equal(2);
    expect(data.preference.overrides.length).to.equal(2);
  });
});

export async function getSubscriberPreference(subscriberToken: string) {
  return await axios.get(`http://127.0.0.1:${process.env.PORT}/v1/widgets/preferences`, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
