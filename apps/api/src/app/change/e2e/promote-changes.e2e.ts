/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum, ChannelCTATypeEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  CreateNotificationTemplateRequestDto,
  UpdateNotificationTemplateRequestDto,
} from '../../notification-template/dto';
import { testCacheService } from '../../../../e2e/setup';

describe('Promote changes', () => {
  let session: UserSession;
  const cacheService = testCacheService().cacheService;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository(cacheService);
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const notificationGroupRepository: NotificationGroupRepository = new NotificationGroupRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should set correct notification group for notification template', async () => {
    const prodEnv = await getProductionEnvironment();

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

    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: parentGroup._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
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
    const notificationTemplateId = body.data._id;

    await session.applyChanges({
      enabled: false,
    });

    const prodVersion = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: notificationTemplateId,
    } as any);

    expect(prodVersion._notificationGroupId).to.eq(prodGroup._id);
  });

  it('delete message', async () => {
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

    let { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    const updateData: UpdateNotificationTemplateRequestDto = {
      name: testTemplate.name,
      tags: testTemplate.tags,
      description: testTemplate.description,
      steps: [],
      notificationGroupId: session.notificationGroups[0]._id,
    };

    const notificationTemplateId = body.data._id;

    body = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(updateData);

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodVersion = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: notificationTemplateId,
    } as any);

    expect(prodVersion.steps.length).to.eq(0);
  });

  it('update active flag on notification template', async () => {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    await session.applyChanges({
      enabled: false,
    });

    const notificationTemplateId = body.data._id;

    await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}/status`).send({ active: true });

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodVersion = await notificationTemplateRepository.findOne({
      _organizationId: session.organization._id,
      _notificationId: prodEnv._id,
      _parentId: notificationTemplateId,
    } as any);

    expect(prodVersion.active).to.eq(true);
  });

  it('update existing message', async () => {
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

    let {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    await session.applyChanges({
      enabled: false,
    });

    const notificationTemplateId = data._id;

    const step = data.steps[0];
    const update: UpdateNotificationTemplateRequestDto = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      notificationGroupId: data._notificationGroupId,
      steps: [
        {
          _id: step._templateId,
          _templateId: step._templateId,
          template: {
            name: 'test',
            type: step.template.type,
            cta: step.template.cta,
            content: step.template.content,
          },
        },
      ],
    };

    const body: any = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(update);
    data = body.data;

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodVersion = await messageTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: step._templateId,
    });

    expect(prodVersion.name).to.eq('test');
  });

  it('add one more message', async () => {
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

    let {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
    await session.applyChanges({
      enabled: false,
    });

    const notificationTemplateId = data._id;

    const step = data.steps[0];
    const update: UpdateNotificationTemplateRequestDto = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      notificationGroupId: data._notificationGroupId,
      steps: [
        {
          _id: step._templateId,
          _templateId: step._templateId,
          template: {
            name: 'Message Name',
            content: step.template.content,
            type: step.template.type,
            cta: step.template.cta,
          },
        },
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            content: [{ type: 'text', content: 'This is a sample text block' }],
            type: step.template.type,
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: '',
              },
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
        },
      ],
    };

    const body: any = await session.testAgent.put(`/v1/notification-templates/${notificationTemplateId}`).send(update);
    data = body.data;

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodVersion = await notificationTemplateRepository.find({
      _environmentId: prodEnv._id,
      _parentId: notificationTemplateId,
    });

    expect(prodVersion[0].steps.length).to.eq(2);
  });

  it('should count not applied changes', async () => {
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

    await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    const {
      body: { data },
    } = await session.testAgent.get('/v1/changes/count');

    expect(data).to.eq(1);
  });

  it('should count delete change', async () => {
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

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
    const notificationTemplateId = data._id;
    await session.applyChanges({
      enabled: false,
    });

    await session.testAgent.delete(`/v1/notification-templates/${notificationTemplateId}`);

    const {
      body: { data: count },
    } = await session.testAgent.get('/v1/changes/count');

    expect(count).to.eq(1);
  });

  it('should promote notification group if it is not already promoted', async () => {
    const {
      body: { data: group },
    } = await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name',
    });

    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: group._id,
      steps: [],
    };

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
    const notificationTemplateId = data._id;
    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
        _entityId: notificationTemplateId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    await changes.reduce(async (prev, change) => {
      await session.testAgent.post(`/v1/changes/${change._id}/apply`);
    }, Promise.resolve());

    const count = await changeRepository.count({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      enabled: false,
    });

    expect(count).to.eq(0);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});
