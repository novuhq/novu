import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import {
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  StepTypeEnum,
  INotificationTemplate,
  TriggerTypeEnum,
} from '@novu/shared';
import {
  ChangeRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  EnvironmentRepository,
} from '@novu/dal';
import { isSameDay } from 'date-fns';
import { CreateNotificationTemplateRequestDto } from '../dto';

describe('Create Notification template - /notification-templates (POST)', async () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create email template', async function () {
    const defaultMessageIsActive = true;

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
            content: [{ type: 'text', content: 'This is a sample text block' }],
            type: StepTypeEnum.EMAIL,
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [
                {
                  field: 'firstName',
                  value: 'test value',
                  operator: 'EQUAL',
                },
              ],
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    expect(template._notificationGroupId).to.equal(testTemplate.notificationGroupId);
    const message = template.steps[0];

    expect(message.template.name).to.equal(`${testTemplate.steps[0].template.name}`);
    expect(message.template.active).to.equal(defaultMessageIsActive);
    expect(message.template.subject).to.equal(`${testTemplate.steps[0].template.subject}`);
    expect(message.template.preheader).to.equal(`${testTemplate.steps[0].template.preheader}`);
    expect(message.filters[0].type).to.equal(testTemplate.steps[0].filters[0].type);
    expect(message.filters[0].children.length).to.equal(testTemplate.steps[0].filters[0].children.length);
    expect(message.filters[0].children[0].value).to.equal(testTemplate.steps[0].filters[0].children[0].value);
    expect(message.filters[0].children[0].operator).to.equal(testTemplate.steps[0].filters[0].children[0].operator);
    expect(template.tags[0]).to.equal('test-tag');

    if (Array.isArray(message.template.content) && Array.isArray(testTemplate.steps[0].template.content)) {
      expect(message.template.content[0].type).to.equal(testTemplate.steps[0].template.content[0].type);
    } else {
      throw new Error('content must be an array');
    }

    let change = await changeRepository.findOne({
      _environmentId: session.environment._id,
      _entityId: message._templateId,
    });
    await session.testAgent.post(`/v1/changes/${change._id}/apply`);

    change = await changeRepository.findOne({ _environmentId: session.environment._id, _entityId: template._id });
    await session.testAgent.post(`/v1/changes/${change._id}/apply`);

    const prodEnv = await getProductionEnvironment();

    const prodVersionNotification = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: template._id,
    } as any);

    expect(prodVersionNotification.tags[0]).to.equal(template.tags[0]);
    expect(prodVersionNotification.steps.length).to.equal(template.steps.length);
    expect(prodVersionNotification.triggers[0].type).to.equal(template.triggers[0].type);
    expect(prodVersionNotification.triggers[0].identifier).to.equal(template.triggers[0].identifier);
    expect(prodVersionNotification.active).to.equal(template.active);
    expect(prodVersionNotification.draft).to.equal(template.draft);
    expect(prodVersionNotification.name).to.equal(template.name);
    expect(prodVersionNotification.description).to.equal(template.description);

    const prodVersionMessage = await messageTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: message._templateId,
    });

    expect(message.template.name).to.equal(prodVersionMessage.name);
    expect(message.template.subject).to.equal(prodVersionMessage.subject);
    expect(message.template.type).to.equal(prodVersionMessage.type);
    expect(message.template.content).to.deep.equal(prodVersionMessage.content);
    expect(message.template.active).to.equal(prodVersionMessage.active);
  });

  it('should create a valid notification', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test template',
      description: 'This is a test description',
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            content: 'Test Template',
            type: StepTypeEnum.IN_APP,
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: 'https://example.org/profile',
              },
            },
          },
        },
      ],
    };
    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;

    expect(template._id).to.be.ok;
    expect(template.description).to.equal(testTemplate.description);
    expect(template.name).to.equal(testTemplate.name);
    expect(template.draft).to.equal(true);
    expect(template.active).to.equal(false);
    expect(isSameDay(new Date(template.createdAt), new Date()));

    expect(template.steps.length).to.equal(1);
    expect(template.steps[0].template.type).to.equal(ChannelTypeEnum.IN_APP);
    expect(template.steps[0].template.content).to.equal(testTemplate.steps[0].template.content);
    expect(template.steps[0].template.cta.data.url).to.equal(testTemplate.steps[0].template.cta.data.url);
  });

  it('should create event trigger', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test template',
      notificationGroupId: session.notificationGroups[0]._id,
      description: 'This is a test description',
      steps: [
        {
          active: false,
          template: {
            name: 'Message Name',
            content: 'Test Template {{name}} {{lastName}}',
            type: StepTypeEnum.IN_APP,
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: 'https://example.org/profile',
              },
            },
          },
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;

    expect(template.active).to.equal(false);
    expect(template.triggers.length).to.equal(1);
    expect(template.triggers[0].identifier).to.include('test');
    expect(template.triggers[0].type).to.equal(TriggerTypeEnum.EVENT);
  });

  it('should only add shortid to trigger identifier if same identifier exists', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test',
      notificationGroupId: session.notificationGroups[0]._id,
      description: 'This is a test description',
      steps: [],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    expect(template.triggers[0].identifier).to.equal('test');

    const sameNameTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test',
      notificationGroupId: session.notificationGroups[0]._id,
      description: 'This is a test description',
      steps: [],
    };
    const { body: newBody } = await session.testAgent.post(`/v1/notification-templates`).send(sameNameTemplate);

    expect(newBody.data).to.be.ok;
    const newTemplate: INotificationTemplate = newBody.data;

    expect(newTemplate.triggers[0].identifier).to.include('test-');
  });

  it('should add parentId to step', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test template',
      description: 'This is a test description',
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: 'Test Template',
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: 'https://example.org/profile',
              },
            },
          },
        },
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: 'Test Template',
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: 'https://example.org/profile',
              },
            },
          },
        },
      ],
    };
    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;
    const steps = template.steps;
    expect(steps[0]._parentId).to.equal(null);
    expect(steps[0]._id).to.equal(steps[1]._parentId);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});
