import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { ChannelTypeEnum, INotificationTemplate, IUpdateNotificationTemplate } from '@novu/shared';
import { ChangeRepository } from '@novu/dal';

describe('Update notification template by id - /notification-templates/:templateId (PUT)', async () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the notification template', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template = await notificationTemplateService.createTemplate();
    const update: IUpdateNotificationTemplate = {
      name: 'new name for notification',
      steps: [
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
    expect(foundTemplate.steps.length).to.equal(1);
    expect(foundTemplate.steps[0].template.content).to.equal(update.steps[0].content);

    const change = await changeRepository.findOne({
      _entityId: foundTemplate._id,
    });
    expect(change._entityId).to.eq(foundTemplate._id);
  });

  it('should generate new variables on update', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    const template = await notificationTemplateService.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.IN_APP,
          content: 'This is new content for notification {{otherVariable}}',
        },
      ],
    });

    const update: IUpdateNotificationTemplate = {
      steps: [
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

  it('should update the contentType of a message', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    const template = await notificationTemplateService.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.EMAIL,
          contentType: 'editor',
          content: 'Content',
        },
      ],
    });

    const update: IUpdateNotificationTemplate = {
      steps: [
        {
          type: ChannelTypeEnum.EMAIL,
          contentType: 'customHtml',
          content: 'Content',
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.steps[0].template.contentType).to.equal('customHtml');
  });
});
