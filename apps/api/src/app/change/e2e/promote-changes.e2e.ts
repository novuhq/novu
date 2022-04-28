import {
  ChangeRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  EnvironmentRepository,
} from '@novu/dal';
import { ChannelCTATypeEnum, ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateNotificationTemplateDto } from '../../notification-template/dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../../notification-template/dto/update-notification-template.dto';

describe('Promote changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const notificationGroupRepository: NotificationGroupRepository = new NotificationGroupRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  const applyChanges = async () => {
    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    await changes.reduce(async (prev, change) => {
      await session.testAgent.post(`/v1/changes/${change._id}/apply`);
    }, Promise.resolve());
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should set correct notification group for notification template', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
    });

    const parentGroup = await notificationGroupRepository.create({
      name: 'test',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const prodGroup = await notificationGroupRepository.create({
      name: 'test',
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      _parentId: parentGroup._id,
    });

    const testTemplate: Partial<CreateNotificationTemplateDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: parentGroup._id,
      steps: [
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
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
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
    const notificationTemplateId = body.data._id;

    await applyChanges();

    const prodVersion = await notificationTemplateRepository.findOne({
      _parentId: notificationTemplateId,
    });

    expect(prodVersion._notificationGroupId).to.eq(prodGroup._id);
  });

  it('delete message', async () => {
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
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    let { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    const updateData: UpdateNotificationTemplateDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const notificationTemplateId = body.data._id;

    body = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(updateData);

    await applyChanges();

    const prodVersion = await notificationTemplateRepository.findOne({
      _parentId: notificationTemplateId,
    });

    expect(prodVersion.steps.length).to.eq(0);
  });

  it('update active flag on notification template', async () => {
    const testTemplate: Partial<CreateNotificationTemplateDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    const notificationTemplateId = body.data._id;

    await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}/status`).send({ active: true });
    await applyChanges();

    const prodVersion = await notificationTemplateRepository.findOne({
      _parentId: notificationTemplateId,
    });

    expect(prodVersion.active).to.eq(true);
  });

  it('update existing message', async () => {
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
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    let {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    await applyChanges();

    const notificationTemplateId = data._id;

    const step = data.steps[0];
    const update: UpdateNotificationTemplateDto = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      notificationGroupId: data._notificationGroupId,
      steps: [
        {
          _id: step._templateId,
          name: 'test',
          type: step.template.type,
          cta: step.template.cta,
          content: step.template.content,
        },
      ],
    };

    const body: any = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(update);
    data = body.data;

    await applyChanges();

    const prodVersion = await messageTemplateRepository.findOne({
      _parentId: step._templateId,
    });

    expect(prodVersion.name).to.eq('test');
  });

  it('add one more message', async () => {
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
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    let {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
    await applyChanges();

    const notificationTemplateId = data._id;

    const step = data.steps[0];
    const update: UpdateNotificationTemplateDto = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      notificationGroupId: data._notificationGroupId,
      steps: [
        {
          _id: step._templateId,
          name: step.template.name,
          type: step.template.type,
          cta: step.template.cta,
          content: step.template.content,
        },
        {
          name: 'Message Name 2',
          subject: 'Test email subject 2',
          type: ChannelTypeEnum.EMAIL,
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '',
            },
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [
                {
                  field: 'secondName',
                  value: 'test value',
                  operator: 'EQUAL',
                },
              ],
            },
          ],
          content: [
            {
              type: 'text',
              content: 'This is a sample text block',
            },
          ],
        },
      ],
    };

    const body: any = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(update);
    data = body.data;

    await applyChanges();

    const prodVersion = await notificationTemplateRepository.find({
      _parentId: notificationTemplateId,
    });

    expect(prodVersion[0].steps.length).to.eq(2);
  });
});
