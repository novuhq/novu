import { Novu } from '@novu/api';
import { MessageRepository, NotificationTemplateEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import {
  ActorTypeEnum,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  SystemAvatarIconEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Notifications Count - /inbox/notifications/count (GET) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();

  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
    template = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for <b>{{firstName}}</b>',
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '/cypress/test-shell/example/test?test-param=true',
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
  });

  const getNotificationsCount = async (
    filters: Array<{
      tags?: string[];
      read?: boolean;
      archived?: boolean;
      snoozed?: boolean;
      seen?: boolean;
      severity?: SeverityLevelEnum[];
    }>
  ) => {
    return await session.testAgent
      .get(`/v1/inbox/notifications/count?filters=${JSON.stringify(filters)}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(
        novuClient.trigger({
          workflowId: templateToTrigger.triggers[0].identifier,
          to: { subscriberId: session.subscriberId },
        })
      );
    }

    await Promise.all(promises);
    await session.waitForJobCompletion(templateToTrigger._id);
  };

  it('should throw exception when filtering for unread and archived notifications', async () => {
    await triggerEvent(template);

    const { body, status } = await getNotificationsCount([{ read: false, archived: true }]);

    expect(status).to.equal(400);
    expect(body.message).to.equal('Filtering for unread and archived notifications is not supported.');
  });

  it('should return all notifications count', async () => {
    const count = 4;
    await triggerEvent(template, count);
    const { body, status } = await getNotificationsCount([{}]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({});
  });

  it('should return notifications count for specified tags', async () => {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    const { body, status } = await getNotificationsCount([{ tags }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      tags,
    });
  });

  it('should return notifications count for read notifications', async () => {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { read: true } }
    );

    const { body, status } = await getNotificationsCount([{ read: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      read: true,
    });
  });

  it('should return notifications count for archived notifications', async () => {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { archived: true } }
    );

    const { body, status } = await getNotificationsCount([{ archived: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      archived: true,
    });
  });

  it('should return notifications count for read and archived notifications', async () => {
    const count = 2;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { read: true, archived: true } }
    );

    const { body, status } = await getNotificationsCount([{ read: true, archived: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      read: true,
      archived: true,
    });
  });

  it('should return notifications count for snoozed notifications', async () => {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { snoozedUntil: new Date() } }
    );

    const { body, status } = await getNotificationsCount([{ snoozed: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      snoozed: true,
    });
  });

  it('should return read notifications count for specified tags', async () => {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
        tags: { $in: tags },
      },
      { $set: { read: true } }
    );

    const { body, status } = await getNotificationsCount([{ tags, read: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      tags,
      read: true,
    });
  });

  it('should return notification counts for multiple filters', async () => {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    const { body, status } = await getNotificationsCount([{ tags }, { read: false }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(2);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      tags,
    });
    expect(body.data[1].count).to.eq(6);
    expect(body.data[1].filter).to.deep.equal({ read: false });
  });

  it('should return notifications count for seen notifications', async () => {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { seen: true } }
    );

    const { body, status } = await getNotificationsCount([{ seen: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      seen: true,
    });
  });

  it('should return notifications count for unseen notifications', async () => {
    const count = 4;
    await triggerEvent(template, count);

    const { body, status } = await getNotificationsCount([{ seen: false }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      seen: false,
    });
  });

  it('should return seen notifications count for specified tags', async () => {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
        tags: { $in: tags },
      },
      { $set: { seen: true } }
    );

    const { body, status } = await getNotificationsCount([{ tags, seen: true }]);

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.length).to.eq(1);
    expect(body.data[0].count).to.eq(count);
    expect(body.data[0].filter).to.deep.equal({
      tags,
      seen: true,
    });
  });

  describe('Severity filtering', () => {
    it('should return notifications count for high severity', async () => {
      const highSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      const mediumSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      // Trigger notifications with different severities
      await triggerEvent(highSeverityTemplate, 3);
      await triggerEvent(mediumSeverityTemplate, 2);
      await triggerEvent(template, 1); // Default template (no severity - none)

      const { body, status } = await getNotificationsCount([{ severity: [SeverityLevelEnum.HIGH] }]);

      expect(status).to.equal(200);
      expect(body.data).to.be.ok;
      expect(body.data.length).to.eq(1);
      expect(body.data[0].count).to.eq(3);
      expect(body.data[0].filter).to.deep.equal({
        severity: [SeverityLevelEnum.HIGH],
      });
    });

    it('should return notifications count for multiple severities', async () => {
      const highSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      const lowSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.LOW,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Low severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      // Trigger notifications with different severities
      await triggerEvent(highSeverityTemplate, 2);
      await triggerEvent(lowSeverityTemplate, 3);
      await triggerEvent(template, 1); // Default template (no severity - none)

      const { body, status } = await getNotificationsCount([
        { severity: [SeverityLevelEnum.HIGH, SeverityLevelEnum.LOW] },
      ]);

      expect(status).to.equal(200);
      expect(body.data).to.be.ok;
      expect(body.data.length).to.eq(1);
      expect(body.data[0].count).to.eq(5); // 2 high + 3 low
      expect(body.data[0].filter).to.deep.equal({
        severity: [SeverityLevelEnum.HIGH, SeverityLevelEnum.LOW],
      });
    });

    it('should return notifications count for none severity', async () => {
      const highSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      // Trigger notifications with different severities
      await triggerEvent(highSeverityTemplate, 2);
      await triggerEvent(template, 3); // Default template (no severity - none)

      const { body, status } = await getNotificationsCount([{ severity: [SeverityLevelEnum.NONE] }]);

      expect(status).to.equal(200);
      expect(body.data).to.be.ok;
      expect(body.data.length).to.eq(1);
      expect(body.data[0].count).to.eq(3);
      expect(body.data[0].filter).to.deep.equal({
        severity: [SeverityLevelEnum.NONE],
      });
    });

    it('should return notifications count combining severity with other filters', async () => {
      const tags = ['urgent'];
      const highSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        tags,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity urgent notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      const highSeverityTemplateNoTags = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification without tags',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      // Trigger notifications
      await triggerEvent(highSeverityTemplate, 2); // High severity with urgent tags
      await triggerEvent(highSeverityTemplateNoTags, 3); // High severity without tags

      // Test combining severity and tags filters
      const { body, status } = await getNotificationsCount([{ severity: [SeverityLevelEnum.HIGH], tags, read: false }]);

      expect(status).to.equal(200);
      expect(body.data).to.be.ok;
      expect(body.data.length).to.eq(1);
      expect(body.data[0].count).to.eq(2); // Only the high severity with urgent tags
      expect(body.data[0].filter).to.deep.equal({
        severity: [SeverityLevelEnum.HIGH],
        tags,
        read: false,
      });
    });

    it('should return multiple filters with different severities', async () => {
      const highSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      const mediumSeverityTemplate = await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity notification',
            actor: {
              type: ActorTypeEnum.SYSTEM_ICON,
              data: SystemAvatarIconEnum.WARNING,
            },
          },
        ],
      });

      // Trigger notifications
      await triggerEvent(highSeverityTemplate, 2);
      await triggerEvent(mediumSeverityTemplate, 3);

      const { body, status } = await getNotificationsCount([
        { severity: [SeverityLevelEnum.HIGH] },
        { severity: [SeverityLevelEnum.MEDIUM] },
      ]);

      expect(status).to.equal(200);
      expect(body.data).to.be.ok;
      expect(body.data.length).to.eq(2);
      expect(body.data[0].count).to.eq(2);
      expect(body.data[0].filter).to.deep.equal({
        severity: [SeverityLevelEnum.HIGH],
      });
      expect(body.data[1].count).to.eq(3);
      expect(body.data[1].filter).to.deep.equal({
        severity: [SeverityLevelEnum.MEDIUM],
      });
    });
  });
});
