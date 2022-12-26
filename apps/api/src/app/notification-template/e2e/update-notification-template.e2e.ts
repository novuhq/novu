import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { StepTypeEnum, INotificationTemplate, IUpdateNotificationTemplateDto } from '@novu/shared';
import { ChangeRepository } from '@novu/dal';
import { CreateNotificationTemplateRequestDto, UpdateNotificationTemplateRequestDto } from '../dto';

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
    const update: IUpdateNotificationTemplateDto = {
      name: 'new name for notification',
      steps: [
        {
          template: {
            type: StepTypeEnum.IN_APP,
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
      _environmentId: session.environment._id,
      _entityId: foundTemplate._id,
    });
    expect(change._entityId).to.eq(foundTemplate._id);
  });

  it('should throw error if trigger identifier already exists', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template1 = await notificationTemplateService.createTemplate();
    const template2 = await notificationTemplateService.createTemplate();
    const update: IUpdateNotificationTemplateDto = {
      identifier: template1.triggers[0].identifier,
    };

    const { body } = await session.testAgent.put(`/v1/notification-templates/${template2._id}`).send(update);

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(
      `Notification template with identifier ${template1.triggers[0].identifier} already exists`
    );
    expect(body.error).to.equal('Bad Request');
  });

  it('should update the trigger identifier', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template = await notificationTemplateService.createTemplate();
    const newIdentifier = `${template.triggers[0].identifier}-new`;
    const update: IUpdateNotificationTemplateDto = {
      identifier: newIdentifier,
    };

    const { body } = await session.testAgent.put(`/v1/notification-templates/${template._id}`).send(update);

    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.description).to.equal(template.description);
    expect(foundTemplate.name).to.equal(template.name);
    expect(foundTemplate.triggers[0].identifier).to.equal(newIdentifier);

    const change = await changeRepository.findOne({
      _environmentId: session.environment._id,
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
          type: StepTypeEnum.IN_APP,
          content: 'This is new content for notification {{otherVariable}}',
        },
      ],
    });

    const update: IUpdateNotificationTemplateDto = {
      steps: [
        {
          template: {
            type: StepTypeEnum.IN_APP,
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
          type: StepTypeEnum.EMAIL,
          contentType: 'editor',
          content: 'Content',
        },
      ],
    });

    const update: IUpdateNotificationTemplateDto = {
      steps: [
        {
          active: false,
          template: {
            type: StepTypeEnum.EMAIL,
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
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            preheader: 'Test email preheader',
            type: StepTypeEnum.EMAIL,
            content: [],
          },
        },
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            type: StepTypeEnum.EMAIL,
            content: [],
          },
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    const template: INotificationTemplate = body.data;

    const updateData: UpdateNotificationTemplateRequestDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [
        ...template.steps.map((step) => {
          return {
            _id: step._id,
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              preheader: '',
              type: StepTypeEnum.EMAIL,
              content: [],
              cta: null,
            },
            _parentId: step._parentId,
          };
        }),
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            type: StepTypeEnum.EMAIL,
            content: [],
            cta: null,
          },
        },
      ],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const { body: updated } = await session.testAgent
      .put(`/v1/notification-templates/${template._id}`)
      .send(updateData);

    const steps = updated.data.steps;

    expect(steps[0]._parentId).to.equal(null);
    expect(steps[0].template.preheader).to.equal('');
    expect(steps[0]._id).to.equal(steps[1]._parentId);
    expect(steps[1]._id).to.equal(steps[2]._parentId);
  });
});
