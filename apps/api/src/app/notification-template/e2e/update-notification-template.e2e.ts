import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@notifire/testing';
import { ChannelTypeEnum, INotificationTemplate, IUpdateNotificationTemplate } from '@notifire/shared';

describe('Update notification template by id - /notification-templates/:templateId (PUT)', async () => {
  let session: UserSession;
  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the notification template', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.application._id
    );
    const template = await notificationTemplateService.createTemplate();
    const update: IUpdateNotificationTemplate = {
      name: 'new name for notification',
      messages: [
        {
          type: ChannelTypeEnum.IN_APP,
          content: 'This is new content for notification',
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;
    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.name).to.equal('new name for notification');
    expect(foundTemplate.description).to.equal(template.description);
    expect(foundTemplate.messages.length).to.equal(1);
    expect(foundTemplate.messages[0].template.content).to.equal(update.messages[0].content);
  });

  it('should generate new variables on update', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.application._id
    );

    const template = await notificationTemplateService.createTemplate({
      messages: [
        {
          type: ChannelTypeEnum.IN_APP,
          content: 'This is new content for notification {{otherVariable}}',
        },
      ],
    });

    const update: IUpdateNotificationTemplate = {
      messages: [
        {
          type: ChannelTypeEnum.IN_APP,
          content: 'This is new content for notification {{newVariableFromUpdate}}',
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;
    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.triggers[0].variables[0].name).to.equal('newVariableFromUpdate');
  });
});
