/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import {
  ChangeRepository,
  EnvironmentRepository,
  LayoutRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  ChannelCTATypeEnum,
  EmailBlockTypeEnum,
  ITemplateVariable,
  LayoutDescription,
  LayoutId,
  LayoutName,
  StepTypeEnum,
  FilterPartTypeEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';

import {
  CreateNotificationTemplateRequestDto,
  UpdateNotificationTemplateRequestDto,
} from '../../notification-template/dto';

describe('Promote changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const layoutRepository = new LayoutRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const notificationGroupRepository: NotificationGroupRepository = new NotificationGroupRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('Notification template changes', () => {
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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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
      });

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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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
      });

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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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

      const body: any = await session.testAgent
        .put(`/v1/notification-templates/${notificationTemplateId}`)
        .send(update);
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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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

      const body: any = await session.testAgent
        .put(`/v1/notification-templates/${notificationTemplateId}`)
        .send(update);
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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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

    it('should set isBlueprint correctly', async () => {
      process.env.BLUEPRINT_CREATOR = session.organization._id;
      const prodEnv = await getProductionEnvironment();

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
              content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
              type: StepTypeEnum.EMAIL,
            },
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: 'AND',
                children: [
                  {
                    on: FilterPartTypeEnum.SUBSCRIBER,
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
      });

      expect(prodVersion.isBlueprint).to.equal(true);
    });
  });

  describe('Layout changes', () => {
    it('should promote a new layout created to production', async () => {
      const layoutName = 'layout-name-creation';
      const layoutDescription = 'Amazing new layout';
      const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
      const variables = [
        { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
      ];
      const isDefault = true;

      const createLayoutPayload = {
        name: layoutName,
        description: layoutDescription,
        content,
        variables,
        isDefault,
      };

      const {
        body: {
          data: { _id: layoutId },
        },
      } = await session.testAgent.post('/v1/layouts').send(createLayoutPayload);

      expect(layoutId).to.be.ok;

      const {
        body: { data: devLayout },
      } = await session.testAgent.get(`/v1/layouts/${layoutId}`);

      const changes = await changeRepository.find(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          enabled: false,
          _entityId: layoutId,
          type: ChangeEntityTypeEnum.DEFAULT_LAYOUT,
        },
        '',
        {
          sort: { createdAt: 1 },
        }
      );

      expect(changes.length).to.eql(1);
      expect(changes[0]._entityId).to.eql(layoutId);
      expect(changes[0].type).to.eql(ChangeEntityTypeEnum.DEFAULT_LAYOUT);
      expect(changes[0].change).to.deep.include({ op: 'add', path: ['_id'], val: layoutId });

      await session.applyChanges({
        enabled: false,
      });

      const prodEnv = await getProductionEnvironment();

      const prodLayout = await layoutRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: layoutId,
      });

      expect(prodLayout).to.be.ok;
      expect(prodLayout._parentId).to.eql(devLayout._id);
      expect(prodLayout._environmentId).to.eql(prodEnv._id);
      expect(prodLayout._organizationId).to.eql(session.organization._id);
      expect(prodLayout._creatorId).to.eql(session.user._id);
      expect(prodLayout.name).to.eql(layoutName);
      expect(prodLayout.content).to.eql(content);
      // TODO: Awful but it comes from the repository directly.
      const { _id: _, ...prodVariables } = prodLayout.variables?.[0] as any;
      expect(prodVariables).to.deep.include(variables[0]);
      expect(prodLayout.contentType).to.eql(devLayout.contentType);
      expect(prodLayout.isDefault).to.eql(isDefault);
      expect(prodLayout.channel).to.eql(devLayout.channel);
    });

    it('should promote the updates done to a layout existing to production', async () => {
      const layoutName = 'layout-name-update';
      const layoutDescription = 'Amazing new layout';
      const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
      const variables = [
        { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
      ];
      const isDefault = false;

      const layoutId = await createLayout(layoutName, layoutDescription, content, variables, isDefault);

      await session.applyChanges({
        enabled: false,
      });

      const updatedLayoutName = 'layout-name-creation-updated';
      const updatedDescription = 'Amazing new layout updated';
      const updatedContent = '<html><body><div>Hello {{organizationName}}, you all {{{body}}}</div></body></html>';
      const updatedVariables = [
        {
          name: 'organizationName',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'Organization',
          required: true,
        },
      ];
      const updatedIsDefault = false;

      const patchLayoutPayload = {
        name: updatedLayoutName,
        description: updatedDescription,
        content: updatedContent,
        variables: updatedVariables,
        isDefault: updatedIsDefault,
      };

      const {
        status,
        body: { data: patchedLayout },
      } = await session.testAgent.patch(`/v1/layouts/${layoutId}`).send(patchLayoutPayload);
      expect(status).to.eql(200);

      const changes = await changeRepository.find(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          enabled: false,
          _entityId: layoutId,
          type: ChangeEntityTypeEnum.LAYOUT,
        },
        '',
        {
          sort: { createdAt: 1 },
        }
      );

      expect(changes.length).to.eql(1);
      expect(changes[0]._entityId).to.eql(layoutId);
      expect(changes[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
      expect(changes[0].change).to.deep.include.members([
        {
          op: 'update',
          path: ['name'],
          val: updatedLayoutName,
          oldVal: layoutName,
        },
        {
          op: 'update',
          path: ['description'],
          val: updatedDescription,
          oldVal: layoutDescription,
        },
        {
          op: 'update',
          path: ['description'],
          val: updatedDescription,
          oldVal: layoutDescription,
        },
        {
          op: 'update',
          path: ['content'],
          val: '<html><body><div>Hello {{organizationName}}, you all {{{body}}}</div></body></html>',
          oldVal: '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>',
        },
        {
          op: 'update',
          path: ['variables', 0, 'defaultValue'],
          val: 'Organization',
          oldVal: 'Company',
        },
        {
          op: 'update',
          path: ['variables', 0, 'required'],
          val: true,
          oldVal: false,
        },
      ]);

      await session.applyChanges({
        enabled: false,
      });

      const prodEnv = await getProductionEnvironment();

      const prodLayout = await layoutRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: layoutId,
      });

      expect(prodLayout).to.be.ok;
      expect(prodLayout._parentId).to.eql(patchedLayout._id);
      expect(prodLayout._environmentId).to.eql(prodEnv._id);
      expect(prodLayout._organizationId).to.eql(session.organization._id);
      expect(prodLayout._creatorId).to.eql(session.user._id);
      expect(prodLayout.name).to.eql(updatedLayoutName);
      expect(prodLayout.content).to.eql(updatedContent);
      // TODO: Awful but it comes from the repository directly.
      const { _id, ...prodVariables } = prodLayout.variables?.[0] as any;
      expect(prodVariables).to.deep.include(updatedVariables[0]);
      expect(prodLayout.contentType).to.eql(patchedLayout.contentType);
      expect(prodLayout.isDefault).to.eql(updatedIsDefault);
      expect(prodLayout.channel).to.eql(patchedLayout.channel);
    });

    it('should promote the deletion of a layout to production', async () => {
      const layoutName = 'layout-name-deletion';
      const layoutDescription = 'Amazing new layout';
      const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
      const variables = [
        { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
      ];
      const isDefault = false;

      const layoutId = await createLayout(layoutName, layoutDescription, content, variables, isDefault);
      const {
        body: { data: devLayout },
      } = await session.testAgent.get(`/v1/layouts/${layoutId}`);

      const changes = await changeRepository.find(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          enabled: false,
          _entityId: layoutId,
          type: ChangeEntityTypeEnum.LAYOUT,
        },
        '',
        {
          sort: { createdAt: 1 },
        }
      );

      expect(changes.length).to.eql(1);
      expect(changes[0]._entityId).to.eql(layoutId);
      expect(changes[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
      expect(changes[0].change).to.deep.include({ op: 'add', path: ['_id'], val: layoutId });

      await session.applyChanges({
        enabled: false,
      });

      const {
        body: { data: deletedLayout },
        status,
      } = await session.testAgent.delete(`/v1/layouts/${layoutId}`);

      expect(status).to.eql(204);

      const deletionChanges = await changeRepository.find(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          enabled: false,
          _entityId: layoutId,
          type: ChangeEntityTypeEnum.LAYOUT,
        },
        '',
        {
          sort: { createdAt: 1 },
        }
      );

      expect(deletionChanges.length).to.eql(1);
      expect(deletionChanges[0]._entityId).to.eql(layoutId);
      expect(deletionChanges[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
      expect(deletionChanges[0].change).to.deep.include.members([
        {
          op: 'update',
          path: ['deleted'],
          val: true,
          oldVal: false,
        },
        {
          op: 'add',
          path: ['isDeleted'],
          val: true,
        },
      ]);

      await session.applyChanges({
        enabled: false,
      });

      const prodEnv = await getProductionEnvironment();

      const prodLayout = await layoutRepository.findOne({
        _environmentId: prodEnv._id,
        _parentId: layoutId,
      });

      expect(prodLayout).to.not.be.ok;
    });
  });

  async function createLayout(
    layoutName: LayoutName,
    layoutDescription: LayoutDescription,
    content: string,
    variables: ITemplateVariable[],
    isDefault: boolean
  ): Promise<LayoutId> {
    const createLayoutPayload = {
      name: layoutName,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    };

    const {
      body: {
        data: { _id: layoutId },
      },
    } = await session.testAgent.post('/v1/layouts').send(createLayoutPayload);

    expect(layoutId).to.be.ok;

    return layoutId;
  }

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});
