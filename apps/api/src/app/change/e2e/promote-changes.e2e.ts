/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import {
  ChangeRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationTemplateRepository,
  EnvironmentEntity,
  FeedRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  ChannelCTATypeEnum,
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  StepTypeEnum,
  FilterPartTypeEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';

import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto } from '../../workflows/dto';

describe('Promote changes', () => {
  let session: UserSession;
  let prodEnv: EnvironmentEntity;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const notificationGroupRepository: NotificationGroupRepository = new NotificationGroupRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();
  const feedRepository: FeedRepository = new FeedRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    prodEnv = await getProductionEnvironment();
  });

  describe('Notification template changes', () => {
    it('should set correct notification group for notification template', async () => {
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

      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: parentGroup._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
      const notificationTemplateId = body.data._id;

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      });

      expect(prodVersion?._notificationGroupId).to.eq(prodGroup._id);
    });

    it('should promote step variables default values', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a {{variable}}' }],
              type: StepTypeEnum.EMAIL,
              variables: [
                {
                  name: 'variable',
                  type: TemplateVariableTypeEnum.STRING,
                  defaultValue: 'Test Default Value',
                  required: false,
                },
              ],
            },
          },
        ],
      };

      const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
      const notificationTemplateId = body.data._id;

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      });
      let prodVersionMessage = await messageTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _id: prodVersion?.steps[0]._templateId,
      });

      const variable = prodVersionMessage?.variables?.[0];
      expect(variable?.name).to.eq('variable');
      expect(variable?.type).to.eq(TemplateVariableTypeEnum.STRING);
      expect(variable?.required).to.eq(false);
      expect(variable?.defaultValue).to.eq('Test Default Value');

      const step = body.data.steps[0];
      const update: Partial<UpdateWorkflowRequestDto> = {
        steps: [
          {
            _id: step._templateId,
            _templateId: step._templateId,
            template: {
              type: step?.template?.type,
              content: step.template.content,
              variables: [
                {
                  name: 'variable',
                  type: TemplateVariableTypeEnum.STRING,
                  defaultValue: 'New Default Value',
                  required: true,
                },
              ],
            },
          },
        ],
      };

      await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(update);

      await session.applyChanges({
        enabled: false,
      });

      prodVersionMessage = await messageTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _id: prodVersion?.steps[0]._templateId,
      });

      const updatedVariable = prodVersionMessage?.variables?.[0];
      expect(updatedVariable?.name).to.eq('variable');
      expect(updatedVariable?.type).to.eq(TemplateVariableTypeEnum.STRING);
      expect(updatedVariable?.required).to.eq(true);
      expect(updatedVariable?.defaultValue).to.eq('New Default Value');
    });

    it('delete message', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      let { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

      const updateData: UpdateWorkflowRequestDto = {
        name: testTemplate.name,
        tags: testTemplate.tags,
        description: testTemplate.description,
        steps: [],
        notificationGroupId: session.notificationGroups[0]._id,
      };

      const notificationTemplateId = body.data._id;

      body = await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(updateData);

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      } as any);

      expect(prodVersion?.steps.length).to.eq(0);
    });

    it('update active flag on notification template', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [],
      };

      const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

      await session.applyChanges({
        enabled: false,
      });

      const notificationTemplateId = body.data._id;

      await session.testAgent.put(`/v1/workflows/${notificationTemplateId}/status`).send({ active: true });

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.findOne({
        _organizationId: session.organization._id,
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      });

      expect(prodVersion?.active).to.eq(true);
    });

    it('update existing message', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      let {
        body: { data },
      } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

      await session.applyChanges({
        enabled: false,
      });

      const notificationTemplateId = data._id;

      const step = data.steps[0];
      const update: UpdateWorkflowRequestDto = {
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

      const body: any = await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(update);
      data = body.data;

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await messageTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: step._templateId,
      });

      expect(prodVersion?.name).to.eq('test');
    });

    it('add one more message', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      let {
        body: { data },
      } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
      await session.applyChanges({
        enabled: false,
      });

      const notificationTemplateId = data._id;

      const step = data.steps[0];
      const update: UpdateWorkflowRequestDto = {
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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
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
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'secondName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const body: any = await session.testAgent.put(`/v1/workflows/${notificationTemplateId}`).send(update);
      data = body.data;

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.find({
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      });

      expect(prodVersion[0].steps.length).to.eq(2);
    });

    it('should count not applied changes', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      await session.testAgent.post(`/v1/workflows`).send(testTemplate);

      const {
        body: { data },
      } = await session.testAgent.get('/v1/changes/count');

      expect(data).to.eq(1);
    });

    it('should count delete change', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const {
        body: { data },
      } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
      const notificationTemplateId = data._id;
      await session.applyChanges({
        enabled: false,
      });

      await session.testAgent.delete(`/v1/workflows/${notificationTemplateId}`);

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

      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: group._id,
        steps: [],
      };

      const {
        body: { data },
      } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
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

    it('should set isBlueprint correctly', async () => {
      process.env.BLUEPRINT_CREATOR = session.organization._id;

      const parentGroup = await notificationGroupRepository.create({
        name: 'test',
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      await notificationGroupRepository.create({
        name: 'test',
        _environmentId: prodEnv._id,
        _organizationId: session.organization._id,
        _parentId: parentGroup._id,
      });

      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: parentGroup._id,
        steps: [
          {
            template: {
              name: 'Message Name',
              subject: 'Test email subject',
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
                    field: 'firstName',
                    value: 'test value',
                    operator: FieldOperatorEnum.EQUAL,
                  },
                ],
              },
            ],
          },
        ],
      };

      const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
      const notificationTemplateId = body.data._id;

      await session.applyChanges({
        enabled: false,
      });

      const prodVersion = await notificationTemplateRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: notificationTemplateId,
      });

      expect(prodVersion?.isBlueprint).to.equal(true);
    });

    it('should merge creation, and status changes to one change', async () => {
      const testTemplate: Partial<CreateWorkflowRequestDto> = {
        name: 'test email template',
        description: 'This is a test description',
        tags: ['test-tag'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [],
      };

      const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

      const notificationTemplateId = body.data._id;

      await session.testAgent.put(`/v1/workflows/${notificationTemplateId}/status`).send({ active: true });

      await session.testAgent.put(`/v1/workflows/${notificationTemplateId}/status`).send({ active: false });

      const changes = await changeRepository.find(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          _parentId: { $exists: false, $eq: null },
          enabled: false,
        },
        '',
        {
          sort: { createdAt: 1 },
        }
      );

      expect(changes.length).to.eq(1);
    });

    it('should not have feed in production after feed delete', async () => {
      const testFeed = {
        name: 'Test delete feed in message',
      };

      const {
        body: { data: feed },
      } = await session.testAgent.post(`/v1/feeds`).send(testFeed);

      await session.testAgent.delete(`/v1/feeds/${feed._id}`).send();

      await session.applyChanges({
        enabled: false,
      });

      const devFeeds = await feedRepository.find({
        _environmentId: session.environment._id,
        name: feed.name,
      });
      expect(devFeeds.length).to.equal(0);

      const prodFeeds = await feedRepository.find({
        _environmentId: prodEnv._id,
        name: feed.name,
      });
      expect(prodFeeds.length).to.equal(0);
    });
  });

  async function getProductionEnvironment(): Promise<EnvironmentEntity> {
    const production = await environmentRepository.findOne({
      _parentId: session.environment._id,
    });

    if (!production) {
      throw new Error('No production environment');
    }

    return production;
  }
});
