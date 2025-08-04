import { Novu } from '@novu/api';
import { MessageRepository, NotificationTemplateEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { ActorTypeEnum, ChannelTypeEnum, StepTypeEnum, SystemAvatarIconEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Snooze and Unsnooze Notifications - /inbox/notifications/:id/{snooze,unsnooze} (PATCH) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  let notificationId: string;

  const snoozeNotification = async (id: string, snoozeUntil: Date) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/snooze`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send({ snoozeUntil });
  };

  const unsnoozeNotification = async (id: string) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/unsnooze`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send();
  };

  const getNotification = async (id: string) => {
    const response = await session.testAgent
      .get(`/v1/inbox/notifications`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    if (response.status !== 200) {
      return response;
    }

    // Find the specific notification in the results
    const notification = response.body.data.find((notif) => notif.id === id);
    if (notification) {
      // Return a response object that mimics a single notification endpoint response
      return {
        status: 200,
        body: notification,
      };
    }

    // Return 404 if notification not found
    return {
      status: 404,
      body: { message: 'Notification not found' },
    };
  };

  // Helper to get notifications with specific filters
  const getNotificationsWithFilter = async (filter: { snoozed?: boolean } = {}) => {
    let url = `/v1/inbox/notifications`;
    const queryParams: string[] = [];

    if (filter.snoozed !== undefined) {
      queryParams.push(`snoozed=${filter.snoozed}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    return await session.testAgent.get(url).set('Authorization', `Bearer ${session.subscriberToken}`);
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    novuClient = initNovuClassSdk(session);

    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test snooze/unsnooze notification',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });

    // Trigger the notification
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });

    // Wait for job to complete
    await session.waitForJobCompletion(template._id);

    subscriber = (await subscriberRepository.findBySubscriberId(
      session.environment._id,
      session.subscriberId
    )) as SubscriberEntity;

    // Find the notification
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(messages.length).to.be.greaterThan(0, 'No notifications found');
    notificationId = messages[0]._id;
  });

  it('should successfully snooze a notification', async () => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 1); // Snooze for 1 hour

    // Call the snooze API
    const snoozeResponse = await snoozeNotification(notificationId, snoozeUntil);
    expect(snoozeResponse.status).to.equal(200);

    // Verify through snoozed filter API that the notification is snoozed
    const snoozedList = await getNotificationsWithFilter({ snoozed: true });
    expect(snoozedList.status).to.equal(200);

    const snoozedNotification = snoozedList.body.data.find((notification) => notification.id === notificationId);
    expect(snoozedNotification).to.not.be.undefined;
    expect(snoozedNotification).to.have.property('snoozedUntil').that.is.not.null;

    // Verify the snooze time is approximately correct
    const responseSnoozedTime = new Date(snoozedNotification.snoozedUntil).getTime();
    const expectedSnoozeTime = snoozeUntil.getTime();
    expect(Math.abs(responseSnoozedTime - expectedSnoozeTime)).to.be.lessThan(5000);
  });

  it('should successfully unsnooze a notification', async () => {
    // First snooze the notification
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 1); // Snooze for 1 hour

    await snoozeNotification(notificationId, snoozeUntil);

    // Verify it's snoozed via API using the snoozed filter
    const snoozedList = await getNotificationsWithFilter({ snoozed: true });
    expect(snoozedList.status).to.equal(200);
    expect(snoozedList.body.data.some((notification) => notification.id === notificationId)).to.be.true;

    // Now unsnooze it
    const unsnoozeResponse = await unsnoozeNotification(notificationId);
    expect(unsnoozeResponse.status).to.equal(200);

    // Verify the notification has been unsnoozed via API
    const unsnoozedResponse = await getNotification(notificationId);
    expect(unsnoozedResponse.body).to.have.property('isSnoozed').that.equals(false);
  });

  it('should handle attempting to unsnooze a notification that is not snoozed', async () => {
    // Try to unsnooze a notification that hasn't been snoozed
    const response = await unsnoozeNotification(notificationId);

    // Should return a 404 error since the notification is not in a snoozed state
    expect(response.status).to.equal(404);
  });

  it('should reject snooze with invalid date', async () => {
    // Try to snooze with a past date
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 hour in the past

    const response = await snoozeNotification(notificationId, pastDate);

    // Should be a validation error
    expect(response.status).to.equal(422); // Changed from 400 to 422 for validation errors
  });

  it('should reject snooze with duration exceeding tier limit', async () => {
    // Set a far future date (e.g., 180 days)
    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 180);

    const response = await snoozeNotification(notificationId, farFutureDate);

    expect(response.status).to.equal(402); // Payment Required
  });

  it('should ensure notifications can only be snoozed by their owner', async () => {
    // Create a second user
    const secondSession = new UserSession();
    await secondSession.initialize();

    // Try to access with wrong user's token
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 1);

    const response = await session.testAgent
      .patch(`/v1/inbox/notifications/${notificationId}/snooze`)
      .set('Authorization', `Bearer ${secondSession.subscriberToken}`)
      .send({ snoozeUntil });

    expect(response.status).to.equal(404);
  });
});
