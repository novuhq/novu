import { Novu } from '@novu/api';
import type { InboxNotificationDto } from '@novu/api/models/components';
import { NotificationTemplateEntity } from '@novu/dal';
import {
  ActorTypeEnum,
  ButtonTypeEnum,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  StepTypeEnum,
  SystemAvatarIconEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

function validateInboxNotificationDto(notification: InboxNotificationDto): void {
  expect(notification.id).to.be.a('string').that.is.not.empty;
  expect(notification.transactionId).to.be.a('string').that.is.not.empty;
  expect(notification.body).to.be.a('string');
  expect(notification.to).to.be.an('object');
  expect(notification.to.subscriberId).to.be.a('string').that.is.not.empty;
  expect(notification.to.id).to.be.a('string');
  expect(notification.isRead).to.be.a('boolean');
  expect(notification.isSeen).to.be.a('boolean');
  expect(notification.isArchived).to.be.a('boolean');
  expect(notification.isSnoozed).to.be.a('boolean');
  expect(notification.createdAt)
    .to.be.a('string')
    .that.matches(/^\d{4}-/);
  expect(notification.channelType).to.equal(ChannelTypeEnum.IN_APP);
  expect(notification.severity).to.be.a('string');

  if (notification.readAt !== undefined && notification.readAt !== null) {
    expect(notification.readAt)
      .to.be.a('string')
      .that.matches(/^\d{4}-/);
  }

  if (notification.snoozedUntil !== undefined && notification.snoozedUntil !== null) {
    expect(notification.snoozedUntil)
      .to.be.a('string')
      .that.matches(/^\d{4}-/);
  }

  if (notification.archivedAt !== undefined && notification.archivedAt !== null) {
    expect(notification.archivedAt)
      .to.be.a('string')
      .that.matches(/^\d{4}-/);
  }
}

describe('Subscriber notifications - /v2/subscribers/:subscriberId/notifications (SDK) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriberId: string;
  let notificationId: string;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize({ noWidgetSession: true });
    novuClient = initNovuClassSdk(session);

    subscriberId = `test-sub-notif-${randomBytes(6).toString('hex')}`;
    await novuClient.subscribers.create({ subscriberId });

    template = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for <b>{{firstName}}</b>',
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '',
            },
            action: {
              buttons: [
                { type: ButtonTypeEnum.PRIMARY, content: 'Primary' },
                { type: ButtonTypeEnum.SECONDARY, content: 'Secondary' },
              ],
            },
          },
          variables: [
            {
              defaultValue: '',
              name: 'firstName',
              required: false,
              type: TemplateVariableTypeEnum.STRING,
            },
          ],
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: { subscriberId },
    });
    await session.waitForJobCompletion(template._id, undefined);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    expect(listRes.result.data.length).to.be.at.least(1);
    notificationId = listRes.result.data[0].id;
    validateInboxNotificationDto(listRes.result.data[0]);
  });

  it('should list notifications via SDK', async () => {
    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    expect(listRes.result.hasMore).to.be.a('boolean');
    expect(listRes.result.filter).to.be.an('object');
    expect(listRes.result.data.length).to.be.at.least(1);
    validateInboxNotificationDto(listRes.result.data[0]);
  });

  it('should return notification counts via SDK', async () => {
    const countRes = await novuClient.subscribers.notifications.count(subscriberId, JSON.stringify([{}]));

    expect(countRes.result).to.be.an('array').with.lengthOf(1);
    expect(countRes.result[0].count).to.be.a('number').that.is.at.least(1);
    expect(countRes.result[0].filter).to.be.an('object');
  });

  it('should mark notification as read and unread via SDK', async () => {
    const readRes = await novuClient.subscribers.notifications.markAsRead({
      subscriberId,
      notificationId,
    });

    validateInboxNotificationDto(readRes.result);
    expect(readRes.result.isRead).to.equal(true);
    expect(readRes.result.readAt).to.be.a('string');

    const unreadRes = await novuClient.subscribers.notifications.markAsUnread({
      subscriberId,
      notificationId,
    });

    validateInboxNotificationDto(unreadRes.result);
    expect(unreadRes.result.isRead).to.equal(false);
  });

  it('should archive and unarchive notification via SDK', async () => {
    const archivedRes = await novuClient.subscribers.notifications.archive({
      subscriberId,
      notificationId,
    });

    validateInboxNotificationDto(archivedRes.result);
    expect(archivedRes.result.isArchived).to.equal(true);
    expect(archivedRes.result.archivedAt).to.be.a('string');

    const unarchivedRes = await novuClient.subscribers.notifications.unarchive({
      subscriberId,
      notificationId,
    });

    validateInboxNotificationDto(unarchivedRes.result);
    expect(unarchivedRes.result.isArchived).to.equal(false);
  });

  it('should snooze and unsnooze notification via SDK', async () => {
    const snoozeUntil = new Date(Date.now() + 3 * 60 * 1000);

    const snoozedRes = await novuClient.subscribers.notifications.snooze({
      subscriberId,
      notificationId,
      snoozeSubscriberNotificationDto: { snoozeUntil },
    });

    validateInboxNotificationDto(snoozedRes.result);
    expect(snoozedRes.result.isSnoozed).to.equal(true);
    expect(snoozedRes.result.snoozedUntil).to.be.a('string');

    const unsnoozedRes = await novuClient.subscribers.notifications.unsnooze({
      subscriberId,
      notificationId,
    });

    validateInboxNotificationDto(unsnoozedRes.result);
    expect(unsnoozedRes.result.isSnoozed).to.equal(false);
  });

  it('should complete and revert primary action via SDK', async () => {
    const completedRes = await novuClient.subscribers.notifications.completeAction({
      subscriberId,
      notificationId,
      actionType: 'primary',
    });

    validateInboxNotificationDto(completedRes.result);
    expect(completedRes.result.primaryAction).to.be.an('object');
    expect(completedRes.result.primaryAction?.isCompleted).to.equal(true);

    const revertedRes = await novuClient.subscribers.notifications.revertAction({
      subscriberId,
      notificationId,
      actionType: 'primary',
    });

    validateInboxNotificationDto(revertedRes.result);
    expect(revertedRes.result.primaryAction?.isCompleted).to.equal(false);
  });

  it('should complete and revert secondary action via SDK', async () => {
    const completedRes = await novuClient.subscribers.notifications.completeAction({
      subscriberId,
      notificationId,
      actionType: 'secondary',
    });

    validateInboxNotificationDto(completedRes.result);
    expect(completedRes.result.secondaryAction).to.be.an('object');
    expect(completedRes.result.secondaryAction?.isCompleted).to.equal(true);

    const revertedRes = await novuClient.subscribers.notifications.revertAction({
      subscriberId,
      notificationId,
      actionType: 'secondary',
    });

    validateInboxNotificationDto(revertedRes.result);
    expect(revertedRes.result.secondaryAction?.isCompleted).to.equal(false);
  });

  it('should mark notifications as seen via SDK', async () => {
    await novuClient.subscribers.notifications.markAsSeen({ notificationIds: [notificationId] }, subscriberId);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    const updated = listRes.result.data.find((n) => n.id === notificationId);

    expect(updated).to.exist;

    if (!updated) {
      throw new Error('Expected notification after markAsSeen');
    }

    validateInboxNotificationDto(updated);
    expect(updated.isSeen).to.equal(true);
  });

  it('should mark all notifications as read via SDK', async () => {
    await novuClient.subscribers.notifications.markAllAsRead({}, subscriberId);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    for (const n of listRes.result.data) {
      validateInboxNotificationDto(n);
      expect(n.isRead).to.equal(true);
    }
  });

  it('should archive all notifications via SDK', async () => {
    await novuClient.subscribers.notifications.archiveAll({}, subscriberId);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    for (const n of listRes.result.data) {
      validateInboxNotificationDto(n);
      expect(n.isArchived).to.equal(true);
    }
  });

  it('should archive all read notifications via SDK', async () => {
    await novuClient.subscribers.notifications.markAllAsRead({}, subscriberId);
    await novuClient.subscribers.notifications.archiveAllRead({}, subscriberId);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      archived: true,
      limit: 10,
    });

    expect(listRes.result.data.length).to.be.at.least(1);

    for (const n of listRes.result.data) {
      validateInboxNotificationDto(n);
      expect(n.isArchived).to.equal(true);
    }
  });

  it('should delete all notifications via SDK', async () => {
    await novuClient.subscribers.notifications.deleteAll({}, subscriberId);

    const listRes = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    expect(listRes.result.data).to.have.lengthOf(0);
  });

  it('should delete a single notification via SDK', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: { subscriberId },
    });
    await session.waitForJobCompletion(template._id, undefined);

    const listBefore = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    expect(listBefore.result.data.length).to.be.at.least(1);
    const idToDelete = listBefore.result.data[0].id;

    await novuClient.subscribers.notifications.delete({
      subscriberId,
      notificationId: idToDelete,
    });

    const listAfter = await novuClient.subscribers.notifications.list({
      subscriberId,
      limit: 10,
    });

    expect(listAfter.result.data.find((n) => n.id === idToDelete)).to.be.undefined;
  });
});
