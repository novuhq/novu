import { expect } from 'chai';
import { SubscribersService, testServer, UserSession } from '@novu/testing';
import {
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  StepTypeEnum,
  INotificationTemplate,
  TriggerTypeEnum,
  IFieldFilterPart,
  FilterPartTypeEnum,
  EmailProviderIdEnum,
  ChangeEntityTypeEnum,
  INotificationTemplateStep,
} from '@novu/shared';
import {
  ChangeRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  EnvironmentRepository,
  SubscriberEntity,
  OrganizationRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
import { isSameDay } from 'date-fns';
import { CreateWorkflowRequestDto } from '../dto';

import axios from 'axios';

describe('Create Workflow - /workflows (POST)', async () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const messageTemplateRepository: MessageTemplateRepository = new MessageTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();
  const axiosInstance = axios.create();

  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should be able to create a notification with the API Key', async function () {
    const templateBody: Partial<CreateWorkflowRequestDto> = {
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const response = await axiosInstance.post(`${session.serverUrl}/v1/workflows`, templateBody, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    expect(response.data.data.name).to.equal(templateBody.name);
  });

  it('should create email template', async function () {
    const defaultMessageIsActive = true;

    const templateRequestPayload: Partial<CreateWorkflowRequestDto> = {
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
            senderName: 'Test email sender name',
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
          variants: [
            {
              template: {
                name: 'Better Message Template',
                subject: 'Better subject',
                preheader: 'Better pre header',
                senderName: 'Better pre sender name',
                content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample of Better text block' }],
                type: StepTypeEnum.EMAIL,
              },
              active: defaultMessageIsActive,
              filters: [
                {
                  isNegated: false,
                  type: 'GROUP',
                  value: FieldLogicalOperatorEnum.AND,
                  children: [
                    {
                      on: FilterPartTypeEnum.TENANT,
                      field: 'name',
                      value: 'Titans',
                      operator: FieldOperatorEnum.EQUAL,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/workflows`).send(templateRequestPayload);

    expect(body.data).to.be.ok;
    const templateRequestResult: INotificationTemplate = body.data;

    expect(templateRequestResult._notificationGroupId).to.equal(templateRequestPayload.notificationGroupId);
    const message = templateRequestResult.steps[0] as INotificationTemplateStep;

    const messageRequest = templateRequestPayload?.steps ? templateRequestPayload?.steps[0] : null;
    const filtersTest = messageRequest?.filters ? messageRequest.filters[0] : null;

    const children: IFieldFilterPart = filtersTest?.children[0] as IFieldFilterPart;
    const template = message?.template;

    expect(message?.template?.name).to.equal(`${messageRequest?.template?.name}`);
    expect(message?.template?.active).to.equal(defaultMessageIsActive);
    expect(message?.template?.subject).to.equal(`${messageRequest?.template?.subject}`);
    expect(message?.template?.preheader).to.equal(`${messageRequest?.template?.preheader}`);
    expect(message?.template?.senderName).to.equal(`${messageRequest?.template?.senderName}`);

    const filters = message?.filters ? message?.filters[0] : null;
    expect(filters?.type).to.equal(filtersTest?.type);
    expect(filters?.children.length).to.equal(filtersTest?.children?.length);

    expect(children.value).to.equal(children.value);
    expect(children.operator).to.equal(children.operator);
    expect(templateRequestResult.tags[0]).to.equal('test-tag');

    const variantRequest = messageRequest?.variants ? messageRequest?.variants[0] : null;
    const variantResult = (templateRequestResult.steps[0] as INotificationTemplateStep)?.variants
      ? (templateRequestResult.steps as INotificationTemplateStep)[0]?.variants[0]
      : null;
    expect(variantResult?.template?.name).to.equal(variantRequest?.template?.name);
    expect(variantResult?.template?.active).to.equal(variantRequest?.active);
    expect(variantResult?.template?.subject).to.equal(variantRequest?.template?.subject);
    expect(variantResult?.template?.preheader).to.equal(variantRequest?.template?.preheader);
    expect(variantResult?.template?.senderName).to.equal(variantRequest?.template?.senderName);

    if (Array.isArray(message?.template?.content) && Array.isArray(messageRequest?.template?.content)) {
      expect(message?.template?.content[0].type).to.equal(messageRequest?.template?.content[0].type);
    } else {
      throw new Error('content must be an array');
    }

    let change = await changeRepository.findOne({
      _environmentId: session.environment._id,
      _entityId: message._templateId,
    });
    await session.testAgent.post(`/v1/changes/${change?._id}/apply`);

    change = await changeRepository.findOne({
      _environmentId: session.environment._id,
      _entityId: templateRequestResult._id,
    });
    await session.testAgent.post(`/v1/changes/${change?._id}/apply`);

    const prodEnv = await getProductionEnvironment();

    if (!prodEnv) throw new Error('prodEnv was not found');

    const prodVersionNotification = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: templateRequestResult._id,
    });

    expect(prodVersionNotification?.tags[0]).to.equal(templateRequestResult.tags[0]);
    expect(prodVersionNotification?.steps.length).to.equal(templateRequestResult.steps.length);
    expect(prodVersionNotification?.triggers[0].type).to.equal(templateRequestResult.triggers[0].type);
    expect(prodVersionNotification?.triggers[0].identifier).to.equal(templateRequestResult.triggers[0].identifier);
    expect(prodVersionNotification?.active).to.equal(templateRequestResult.active);
    expect(prodVersionNotification?.draft).to.equal(templateRequestResult.draft);
    expect(prodVersionNotification?.name).to.equal(templateRequestResult.name);
    expect(prodVersionNotification?.description).to.equal(templateRequestResult.description);

    const prodVersionMessage = await messageTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: message._templateId,
    });

    expect(message?.template?.name).to.equal(prodVersionMessage?.name);
    expect(message?.template?.subject).to.equal(prodVersionMessage?.subject);
    expect(message?.template?.type).to.equal(prodVersionMessage?.type);
    expect(message?.template?.content).to.deep.equal(prodVersionMessage?.content);
    expect(message?.template?.active).to.equal(prodVersionMessage?.active);
    expect(message?.template?.preheader).to.equal(prodVersionMessage?.preheader);
    expect(message?.template?.senderName).to.equal(prodVersionMessage?.senderName);

    const prodVersionVariant = await messageTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: variantResult._templateId,
    });

    expect(variantResult?.template?.name).to.equal(prodVersionVariant?.name);
    expect(variantResult?.template?.subject).to.equal(prodVersionVariant?.subject);
    expect(variantResult?.template?.type).to.equal(prodVersionVariant?.type);
    expect(variantResult?.template?.content).to.deep.equal(prodVersionVariant?.content);
    expect(variantResult?.template?.active).to.equal(prodVersionVariant?.active);
    expect(variantResult?.template?.preheader).to.equal(prodVersionVariant?.preheader);
    expect(variantResult?.template?.senderName).to.equal(prodVersionVariant?.senderName);
  });

  it('should create a valid notification', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
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
    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;

    expect(template._id).to.be.ok;
    expect(template.description).to.equal(testTemplate.description);
    expect(template.name).to.equal(testTemplate.name);
    expect(template.draft).to.equal(true);
    expect(template.active).to.equal(false);
    expect(isSameDay(new Date(template?.createdAt ? template?.createdAt : '1970'), new Date()));

    const step = template?.steps[0] as INotificationTemplateStep;
    expect(template.steps.length).to.equal(1);
    expect(step?.template?.type).to.equal(ChannelTypeEnum.IN_APP);
    expect(step?.template?.content).to.equal(testTemplate?.steps?.[0]?.template?.content);
    expect(step?.template?.cta?.data.url).to.equal(testTemplate?.steps?.[0]?.template?.cta?.data.url);
  });

  it('should create event trigger', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
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

    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;

    expect(template.active).to.equal(false);
    expect(template.triggers.length).to.equal(1);
    expect(template.triggers[0].identifier).to.include('test');
    expect(template.triggers[0].type).to.equal(TriggerTypeEnum.EVENT);
  });

  it('should only add shortid to trigger identifier if same identifier exists', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test',
      notificationGroupId: session.notificationGroups[0]._id,
      description: 'This is a test description',
      steps: [],
    };

    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    expect(template.triggers[0].identifier).to.equal('test');

    const sameNameTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test',
      notificationGroupId: session.notificationGroups[0]._id,
      description: 'This is a test description',
      steps: [],
    };
    const { body: newBody } = await session.testAgent.post(`/v1/workflows`).send(sameNameTemplate);

    expect(newBody.data).to.be.ok;
    const newTemplate: INotificationTemplate = newBody.data;

    expect(newTemplate.triggers[0].identifier).to.include('test-');
  });

  it('should add parentId to step', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
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
    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;

    const template: INotificationTemplate = body.data;
    const steps = template.steps as INotificationTemplateStep[];
    expect(steps[0]._parentId).to.equal(null);
    expect(steps[0]._id).to.equal(steps[1]._parentId);
  });

  it('should use sender name in email template', async function () {
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
            preheader: 'Test email preheader',
            senderName: 'test',
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
            type: StepTypeEnum.EMAIL,
          },
          filters: [],
        },
      ],
    };

    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    expect(template._notificationGroupId).to.equal(testTemplate.notificationGroupId);
    const message = template.steps[0] as INotificationTemplateStep;
    expect(message.template?.senderName).to.equal('test');
  });

  xit('should build factory integration', () => {
    // const instance = testServer.getService(SendMessageEmail);
    const instance: any = {};

    let result = instance.buildFactoryIntegration({
      _environmentId: '',
      _organizationId: '',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: {
        senderName: 'credentials',
      },
      active: false,
      deleted: false,
      deletedAt: '',
      deletedBy: '',
    });

    expect(result.credentials.senderName).to.equal('credentials');

    result = instance.buildFactoryIntegration(
      {
        _environmentId: '',
        _organizationId: '',
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {
          senderName: 'credentials',
        },
        active: false,
        deleted: false,
        deletedAt: '',
        deletedBy: '',
      },
      ''
    );
    expect(result.credentials.senderName).to.equal('credentials');

    result = instance.buildFactoryIntegration(
      {
        _environmentId: '',
        _organizationId: '',
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {
          senderName: 'credentials',
        },
        active: false,
        deleted: false,
        deletedAt: '',
        deletedBy: '',
      },
      'senderName'
    );

    expect(result.credentials.senderName).to.equal('senderName');
  });

  it('should not promote deleted template that is not existing in prod', async function () {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const { body } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    await session.testAgent.delete(`/v1/workflows/${template._id}`).send();

    const change = await changeRepository.findOne({ _environmentId: session.environment._id, _entityId: template._id });
    await session.testAgent.post(`/v1/changes/${change?._id}/apply`);

    const prodEnv = await getProductionEnvironment();

    if (!prodEnv) throw new Error('prodEnv was not found');

    const prodVersionNotification = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: template._id,
    });

    expect(prodVersionNotification).to.equal(null);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});

describe('Create Notification template from blueprint - /notification-templates (POST)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();
  const organizationRepository: OrganizationRepository = new OrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create template from blueprint', async function () {
    const prodEnv = await getProductionEnvironment();

    const { testTemplateRequestDto, testTemplate, blueprintId, createdTemplate } = await createTemplateFromBlueprint({
      session,
      notificationTemplateRepository,
      prodEnv,
    });

    expect(createdTemplate.blueprintId).to.equal(blueprintId);
    expect(testTemplateRequestDto.name).to.equal(createdTemplate.name);

    const fetchedTemplate = (await session.testAgent.get(`/v1/blueprints/${blueprintId}`).send()).body.data;

    expect(fetchedTemplate.isBlueprint).to.equal(true);
    expect(testTemplateRequestDto.name).to.equal(fetchedTemplate.name);
    expect(createdTemplate.blueprintId).to.equal(fetchedTemplate._id);

    const response = await session.testAgent.get(`/v1/blueprints/${testTemplate._id}`).send();

    expect(response.body.statusCode).to.equal(404);
  });

  it('should create notification group change from blueprint creation', async function () {
    const prodEnv = await getProductionEnvironment();

    const { blueprintId } = await buildBlueprint(session, prodEnv, notificationTemplateRepository);

    const blueprint = (await session.testAgent.get(`/v1/blueprints/${blueprintId}`).send()).body.data;
    const blueprintOrg = await organizationRepository.create({ name: 'Blueprint Org' });
    process.env.BLUEPRINT_CREATOR = blueprintOrg._id;
    blueprint.notificationGroupId = blueprint._notificationGroupId;
    blueprint.notificationGroup.name = 'New Group Name';
    blueprint.blueprintId = blueprint._id;

    const noChanges = (await session.testAgent.get(`/v1/changes?promoted=false`)).body.data;
    expect(noChanges.length).to.equal(0);
    await session.testAgent.post(`/v1/workflows`).send({ ...blueprint });
    const newWorkflowChanges = (await session.testAgent.get(`/v1/changes?promoted=false`)).body.data;
    expect(newWorkflowChanges.length).to.equal(2);
    expect(newWorkflowChanges[0].type).to.equal(ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE);
    expect(newWorkflowChanges[1].type).to.equal(ChangeEntityTypeEnum.NOTIFICATION_GROUP);
  });

  it('should create workflow from blueprint (full blueprint mock)', async function () {
    const createdTemplate: NotificationTemplateEntity = (
      await session.testAgent.post(`/v1/workflows`).send(blueprintTemplateMock)
    ).body.data;

    expect(createdTemplate.blueprintId).to.equal(blueprintTemplateMock.blueprintId);
    expect(createdTemplate.isBlueprint).to.equal(false);
    expect(createdTemplate.name).to.equal(blueprintTemplateMock.name);
    expect(createdTemplate.steps.length).to.equal(blueprintTemplateMock.steps.length);
    expect(createdTemplate._notificationGroupId).to.not.equal(blueprintTemplateMock.notificationGroupId);

    const inAppStep = createdTemplate.steps.find((step) => step.template?.type === StepTypeEnum.IN_APP);

    expect(inAppStep?.template?._feedId).to.be.equal(null);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});

async function buildBlueprint(session, prodEnv, notificationTemplateRepository) {
  const testTemplateRequestDto: Partial<CreateWorkflowRequestDto> = {
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

  const testTemplate = (await session.testAgent.post(`/v1/workflows`).send(testTemplateRequestDto)).body.data;

  process.env.BLUEPRINT_CREATOR = session.organization._id;

  const testEnvBlueprintTemplate = (await session.testAgent.post(`/v1/workflows`).send(testTemplateRequestDto)).body
    .data;

  expect(testEnvBlueprintTemplate).to.be.ok;

  await session.applyChanges({
    enabled: false,
  });

  if (!prodEnv) throw new Error('production environment was not found');

  const blueprintId = (
    await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: testEnvBlueprintTemplate._id,
    })
  )?._id;

  if (!blueprintId) throw new Error('blueprintId was not found');

  return { testTemplateRequestDto, testTemplate, blueprintId };
}

export async function createTemplateFromBlueprint({
  session,
  notificationTemplateRepository,
  prodEnv,
  overrides = {},
}: {
  session: UserSession;
  notificationTemplateRepository: NotificationTemplateRepository;
  prodEnv;
  overrides?: Partial<CreateWorkflowRequestDto>;
}) {
  const { testTemplateRequestDto, testTemplate, blueprintId } = await buildBlueprint(
    session,
    prodEnv,
    notificationTemplateRepository
  );

  const blueprint = (await session.testAgent.get(`/v1/blueprints/${blueprintId}`).send()).body.data;

  blueprint.notificationGroupId = blueprint._notificationGroupId;
  blueprint.blueprintId = blueprint._id;

  const createdTemplate = (await session.testAgent.post(`/v1/workflows`).send({ ...blueprint })).body.data;

  return {
    testTemplateRequestDto,
    testTemplate,
    blueprintId,
    createdTemplate,
  };
}

const blueprintTemplateMock = {
  // _id: '64731d4e1084f5a48293ceab',
  blueprintId: '64731d4e1084f5a48293ceab',
  name: 'Mention in a comment',
  active: true,
  draft: false,
  critical: false,
  isBlueprint: true,
  notificationGroupId: '64731d4e1084f5a48293ce85',
  tags: [],
  triggers: [
    {
      type: 'event',
      identifier: 'fa-solid-fa-comment-mention-in-a-comment',
      variables: [
        {
          name: 'commenterName',
          type: 'String',
          _id: '65ee069a319fc6a92cf436d5',
        },
        {
          name: 'commentSnippet',
          type: 'String',
          _id: '65ee069a319fc6a92cf436d6',
        },
        {
          name: 'commentLink',
          type: 'String',
          _id: '65ee069a319fc6a92cf436d7',
        },
      ],
      reservedVariables: [],
      subscriberVariables: [
        {
          name: 'email',
          _id: '65ee069a319fc6a92cf436d4',
        },
      ],
      _id: '64731d1c1084f5a48293cd4a',
    },
  ],
  steps: [
    {
      active: true,
      shouldStopOnFail: false,
      uuid: 'b6944995-a283-46bd-b55a-18625fd1d4fd',
      name: 'In-App',
      type: 'REGULAR',
      filters: [
        {
          children: [],
          _id: '6485b9052a50bb49867584a0',
        },
      ],
      _templateId: '6485b92e2a50bb4986758656',
      _parentId: null,
      metadata: {
        timed: {
          weekDays: [],
          monthDays: [],
        },
      },
      variants: [],
      _id: '6485b9052a50bb498675846d',
      template: {
        _id: '6485b92e2a50bb4986758656',
        type: 'in_app',
        active: true,
        subject: '',
        variables: [
          {
            name: 'commenterName',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb498675846e',
          },
          {
            name: 'commentSnippet',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb498675846f',
          },
        ],
        content: '{{commenterName}} has mentioned you in <b> "{{commentSnippet}}" </b>',
        contentType: 'editor',
        cta: {
          data: {
            url: '',
          },
          type: 'redirect',
        },
        _environmentId: '64731b391084f5a48293cb87',
        _organizationId: '64731b391084f5a48293cb5b',
        _creatorId: '64731b331084f5a48293cb52',
        _parentId: '6485b9052a50bb498675846d',
        _layoutId: null,
        _feedId: '64731b331084f5a48293cb52',
        feedId: '64731b331084f5a48293cb52',
        deleted: false,
        createdAt: '2023-06-11T12:08:14.446Z',
        updatedAt: '2024-03-10T19:14:45.347Z',
        __v: 0,
        actor: {
          type: 'none',
          data: null,
        },
      },
    },
    {
      active: true,
      shouldStopOnFail: false,
      uuid: '642e42b5-51e6-4d3b-8a91-067c29e902d4',
      name: 'Digest',
      type: 'REGULAR',
      filters: [],
      _templateId: '6485b92e2a50bb4986758662',
      _parentId: '6485b9052a50bb498675846d',
      metadata: {
        amount: 30,
        unit: 'minutes',
        type: 'regular',
        backoffUnit: 'minutes',
        backoffAmount: 5,
        backoff: true,
        timed: {
          weekDays: [],
          monthDays: [],
        },
      },
      variants: [],
      _id: '6485b9052a50bb4986758479',
      template: {
        _id: '6485b92e2a50bb4986758662',
        type: 'digest',
        active: true,
        subject: '',
        variables: [],
        content: '',
        contentType: 'editor',
        _environmentId: '64731b391084f5a48293cb87',
        _organizationId: '64731b391084f5a48293cb5b',
        _creatorId: '64731b331084f5a48293cb52',
        _parentId: '6485b9052a50bb4986758479',
        _layoutId: null,
        deleted: false,
        createdAt: '2023-06-11T12:08:14.520Z',
        updatedAt: '2024-03-10T19:14:45.377Z',
        __v: 0,
      },
    },
    {
      active: true,
      replyCallback: {
        active: true,
        url: 'https://webhook.com/reply-callback',
      },
      shouldStopOnFail: false,
      uuid: '671d86ec-dc27-413c-a666-ec4aeb191691',
      name: 'Email',
      type: 'REGULAR',
      filters: [
        {
          value: 'AND',
          children: [
            {
              operator: 'EQUAL',
              on: 'previousStep',
              step: 'b6944995-a283-46bd-b55a-18625fd1d4fd',
              stepType: 'unseen',
              _id: '6485b9052a50bb49867584a4',
            },
          ],
          _id: '6485b9052a50bb49867584a3',
        },
      ],
      _templateId: '6485b92e2a50bb4986758671',
      _parentId: '6485b9052a50bb4986758479',
      metadata: {
        timed: {
          weekDays: [],
          monthDays: [],
        },
      },
      variants: [],
      _id: '6485b9052a50bb4986758481',
      template: {
        _id: '6485b92e2a50bb4986758671',
        type: 'email',
        active: true,
        subject: '{{mentionedUser}} mention you in {{resourceName}}',
        variables: [
          {
            name: 'mentionedUser',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb4986758482',
          },
          {
            name: 'resourceName',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb4986758483',
          },
          {
            name: 'commentLink',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb4986758484',
          },
          {
            name: 'step.digest',
            type: 'Boolean',
            required: false,
            defaultValue: true,
            _id: '6485b9052a50bb4986758485',
          },
          {
            name: 'step.events.0.mentionedUser',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb4986758486',
          },
          {
            name: 'step.total_count',
            type: 'String',
            required: false,
            _id: '6485b9052a50bb4986758487',
          },
        ],
        content:
          '{{#if step.digest}}\n    {{step.events.0.mentionedUser}} and {{step.total_count}} others mentioned you in a comment. \n{{else}}\n   {{mentionedUser}} mentioned you in a comment. \n{{/if}}\n \n<br/><br/>\n\n<div style="font-family:inherit;text-align:center">\n <a href="{{commentLink}}" style="line-height:30px;display:inline-block;font-weight:400;white-space:nowrap;text-align:center;border:1px solid transparent;height:32px;padding:4px 15px;font-size:14px;border-radius:4px;color:white;background:#f47373;border-color:#f47373;text-decoration:none">\n  Reply to comment\n </a>\n</div>\n\n<br/>\n\n{{#unless step.digest}}\n  You can reply to this email, and the email contents will be posted as a comment reply to this post.\n{{/unless}}\n',
        contentType: 'customHtml',
        _environmentId: '64731b391084f5a48293cb87',
        _organizationId: '64731b391084f5a48293cb5b',
        _creatorId: '64731b331084f5a48293cb52',
        _parentId: '6485b9052a50bb4986758481',
        _layoutId: '64731d4e1084f5a48293ce8f',
        deleted: false,
        createdAt: '2023-06-11T12:08:14.551Z',
        updatedAt: '2024-03-10T19:14:45.409Z',
        __v: 0,
        preheader: '',
        senderName: '',
      },
    },
  ],
  preferenceSettings: {
    email: true,
    sms: true,
    in_app: true,
    chat: true,
    push: true,
  },
  _environmentId: '64731b391084f5a48293cb87',
  _organizationId: '64731b391084f5a48293cb5b',
  _creatorId: '64731b331084f5a48293cb52',
  _parentId: '64731d1c1084f5a48293cd49',
  deleted: false,
  createdAt: '2023-05-28T09:22:22.586Z',
  updatedAt: '2024-03-10T19:14:45.442Z',
  __v: 0,
  deletedAt: '2023-05-30T12:55:34.842Z',
  notificationGroup: {
    _id: '64731d4e1084f5a48293ce85',
    name: 'General',
    _organizationId: '64731b391084f5a48293cb5b',
    _environmentId: '64731b391084f5a48293cb87',
    _parentId: '64731b391084f5a48293cb65',
    createdAt: '2023-05-28T09:22:22.381Z',
    updatedAt: '2023-05-28T09:22:22.381Z',
    __v: 0,
  },
};
