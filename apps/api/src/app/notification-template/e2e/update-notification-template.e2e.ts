import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { ChannelTypeEnum, INotificationTemplate, IUpdateNotificationTemplate } from '@novu/shared';
import { ChangeRepository } from '@novu/dal';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';

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
          template: {
            type: ChannelTypeEnum.IN_APP,
            content: 'This is new content for notification',
          },
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.name).to.equal('new name for notification');
    expect(foundTemplate.description).to.equal(template.description);
    expect(foundTemplate.steps.length).to.equal(1);
    expect(foundTemplate.steps[0].template.content).to.equal(update.steps[0].template.content);

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
          template: {
            type: ChannelTypeEnum.IN_APP,
            content: 'This is new content for notification {{newVariableFromUpdate}}',
          },
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.triggers[0].variables[0].name).to.equal('newVariableFromUpdate');
  });

  it('should update the contentType and active of a message', async function () {
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
          active: false,
          template: {
            type: ChannelTypeEnum.EMAIL,
            contentType: 'customHtml',
            content: 'Content',
          },
        },
      ],
    };
    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.steps[0].active).to.equal(false);
    expect(foundTemplate.steps[0].template.contentType).to.equal('customHtml');
  });

  it('should update the steps', async () => {
    const testTemplate: Partial<CreateNotificationTemplateDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
          content: [],
        },
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
          content: [],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    let template: INotificationTemplate = body.data;

    const updateData: UpdateNotificationTemplateDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [
        ...template.steps.map((step) => {
          return {
            _id: step._id,
            name: 'Message Name',
            subject: 'Test email subject',
            type: ChannelTypeEnum.EMAIL,
            content: [],
            cta: null,
            _parentId: step._parentId,
          };
        }),
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
          content: [],
          cta: null,
        },
      ],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const { body: updated } = await session.testAgent
      .put(`/v1/notification-templates/${template._id}`)
      .send(updateData);

    template = updated.data;
    const steps = template.steps;

    expect(steps[0]._parentId).to.equal(null);
    expect(steps[0]._id).to.equal(steps[1]._parentId);
    expect(steps[1]._id).to.equal(steps[2]._parentId);
  });
});
