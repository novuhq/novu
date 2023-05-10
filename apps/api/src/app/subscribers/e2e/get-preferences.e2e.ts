import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  NotificationTemplateEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
  MessageRepository,
  NotificationTemplateRepository,
} from '@novu/dal';

import { getPreference } from './helpers';

describe('Get Subscribers preferences - /subscribers/preferences/:subscriberId (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;

  const subscriberPreferenceRepository = new SubscriberPreferenceRepository();
  const subscriberRepository = new SubscriberRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should get subscriber preferences', async function () {
    const response = await getPreference(session);

    const data = response.data.data[0];

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });

  it('should handle un existing subscriberId', async function () {
    let error;
    try {
      await getPreference(session, 'unexisting-subscriber-id');
    } catch (e) {
      error = e;
    }

    expect(error).to.be.ok;
    expect(error?.response.data.message).to.contain('not found');
  });

  it('should simulate missing preference', async function () {
    const _subscriberId = (await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId))
      ?._id;

    await updatePreferences(_subscriberId);

    await testPreference();

    const messages = await getMessages(_subscriberId);

    expect(messages.length).to.be.equal(0);

    await session.triggerEvent(template.triggers[0].identifier, session.subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, session.subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, session.subscriberId);
    await session.awaitRunningJobs(template._id, false, 0, session.organization._id);

    const messagesAfterTrigger = await getMessages(_subscriberId);

    expect(messagesAfterTrigger.length).to.be.equal(3);
  });

  async function updatePreferences(_subscriberId) {
    const testRes = await subscriberPreferenceRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: _subscriberId,
      _templateId: template._id,
      [`channels.email`]: true,
    });

    const subscriberPreference = await subscriberPreferenceRepository.findOne({
      _subscriberId: _subscriberId,
      _environmentId: session.environment._id,
    });

    expect(subscriberPreference?.enabled).to.be.equal(true);
    expect(subscriberPreference?.channels.email).to.be.equal(true);
    expect(subscriberPreference?.channels.in_app).to.equal(undefined);
    expect(subscriberPreference?.channels.chat).to.equal(undefined);
    expect(subscriberPreference?.channels.push).to.equal(undefined);

    const update = {
      preferenceSettings: {
        email: true,
        sms: true,
        in_app: false,
        chat: false,
        push: true,
      },
    };

    await notificationTemplateRepository.update(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _id: template._id,
      },
      {
        $set: update,
      }
    );

    const notificationTemplate = await notificationTemplateRepository.findOne({
      _environmentId: session.environment._id,
      _id: template._id,
    });

    expect(notificationTemplate?.active).to.be.equal(true);
    expect(notificationTemplate?.preferenceSettings.email).to.be.equal(true);
    expect(notificationTemplate?.preferenceSettings.chat).to.be.equal(false);
    expect(notificationTemplate?.preferenceSettings.in_app).to.be.equal(false);
    expect(notificationTemplate?.preferenceSettings.sms).to.be.equal(true);
    expect(notificationTemplate?.preferenceSettings.push).to.be.equal(true);
  }

  async function getMessages(_subscriberId) {
    return await messageRepository.find({
      _subscriberId: _subscriberId,
      _environmentId: session.environment._id,
    });
  }

  async function testPreference() {
    const preference = (await getPreference(session)).data.data['0'].preference;

    expect(preference.enabled).to.be.equal(true);
    expect(preference.channels.email).to.be.equal(true);
    expect(preference.channels.in_app).to.be.equal(false);
  }
});
