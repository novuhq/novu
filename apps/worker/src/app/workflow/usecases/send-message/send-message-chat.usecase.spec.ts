import { ChatFactory, DetailEnum, IntegrationSelectionSkipReasonEnum } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  ENDPOINT_TYPES,
  ExecutionDetailsStatusEnum,
  TriggerOverrides,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { hasChatContentOverride, SendMessageChat } from './send-message-chat.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

/**
 * `SendMessageChat` resolves integrations through `executeWithReason` so it can tell a missing
 * integration apart from one withheld by its conditions. The double exposes both entry points so
 * either can be asserted on.
 */
function buildSelectIntegrationDouble(resolve: (command: never) => unknown) {
  return {
    execute: sinon.stub().callsFake(async (command: never) => (await resolve(command)) ?? null),
    executeWithReason: sinon.stub().callsFake(async (command: never) => ({
      integration: (await resolve(command)) ?? undefined,
    })),
  };
}

describe('SendMessageChat - phone-based channel de-duplication', () => {
  function buildUsecase(
    overrides: {
      channelEndpointGroups?: Array<{
        integrationIdentifier: string;
        providerId: string;
        channelData: unknown[];
      }>;
      activePhoneProviders?: ChatProviderIdEnum[];
    } = {}
  ) {
    const {
      channelEndpointGroups = [],
      activePhoneProviders = [ChatProviderIdEnum.WhatsAppBusiness, ChatProviderIdEnum.Sendblue],
    } = overrides;

    const resolveChannelEndpoints = {
      execute: sinon.stub().resolves(channelEndpointGroups),
    };
    const selectIntegration = buildSelectIntegrationDouble((command: { providerId: ChatProviderIdEnum }) =>
      activePhoneProviders.includes(command.providerId) ? { providerId: command.providerId } : null
    );

    const usecase = new SendMessageChat(
      {} as never, // subscriberRepository
      {} as never, // messageRepository
      {} as never, // compileTemplate
      selectIntegration as never,
      {} as never, // getNovuProviderCredentials
      {} as never, // selectVariant
      { execute: sinon.stub().resolves(undefined) } as never, // createExecutionDetails
      {} as never, // moduleRef
      {} as never, // sendWebhookMessage
      resolveChannelEndpoints as never,
      {} as never, // agentRepository
      {} as never, // agentIntegrationRepository
      { getFlag: sinon.stub().resolves(true) } as never // featureFlagsService
    );

    return { usecase, resolveChannelEndpoints, selectIntegration };
  }

  function buildCommand(subscriberOverrides: Record<string, unknown> = {}) {
    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: {},
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: {
        subscriber: {
          subscriberId: 'sub_1',
          locale: 'en',
          phone: '+15551234567',
          channels: [],
          ...subscriberOverrides,
        },
      } as never,
      bridgeData: { outputs: { body: 'hello' } } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.CHAT,
          content: 'hello',
        },
      } as never,
      job: {
        _id: 'job_1',
        tenant: undefined,
      } as never,
    });
  }

  it('should not auto-resolve a phone-based legacy channel when a new channel endpoint already exists for that provider', async () => {
    // Regression: subscriber has phone + a WhatsApp channel endpoint. Auto-resolving
    // WhatsApp from subscriber.phone would double-send to the same provider.
    const whatsappEndpointGroup = {
      integrationIdentifier: 'whatsapp-main',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channelData: [
        {
          identifier: 'ep_1',
          type: ENDPOINT_TYPES.PHONE,
          endpoint: { phoneNumber: '+15551234567' },
        },
      ],
    };

    const { usecase } = buildUsecase({
      channelEndpointGroups: [whatsappEndpointGroup],
      activePhoneProviders: [ChatProviderIdEnum.WhatsAppBusiness],
    });

    const channels = await (usecase as any).resolveAllChannels(buildCommand());

    const whatsappChannels = channels.filter(
      (channel: { data: { providerId: string } }) => channel.data.providerId === ChatProviderIdEnum.WhatsAppBusiness
    );

    expect(whatsappChannels).to.have.length(1);
    expect(whatsappChannels[0].type).to.equal('new');
  });

  it('should still auto-resolve a phone-based legacy channel when no channel endpoint exists for that provider', async () => {
    const { usecase } = buildUsecase({
      channelEndpointGroups: [],
      activePhoneProviders: [ChatProviderIdEnum.WhatsAppBusiness],
    });

    const channels = await (usecase as any).resolveAllChannels(buildCommand());

    expect(channels).to.have.length(1);
    expect(channels[0].type).to.equal('legacy');
    expect(channels[0].data.providerId).to.equal(ChatProviderIdEnum.WhatsAppBusiness);
    expect(channels[0].data.credentials.phoneNumber).to.equal('+15551234567');
  });
});

describe('SendMessageChat - integrations withheld by their conditions', () => {
  function buildUsecase(skipReason: IntegrationSelectionSkipReasonEnum) {
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const selectIntegration = {
      execute: sinon.stub().resolves(null),
      executeWithReason: sinon.stub().resolves({ skipReason }),
    };

    const usecase = new SendMessageChat(
      {} as never, // subscriberRepository
      {} as never, // messageRepository
      {} as never, // compileTemplate
      selectIntegration as never,
      {} as never, // getNovuProviderCredentials
      {} as never, // selectVariant
      createExecutionDetails as never,
      {} as never, // moduleRef
      {} as never, // sendWebhookMessage
      {} as never, // resolveChannelEndpoints
      {} as never, // agentRepository
      {} as never, // agentIntegrationRepository
      { getFlag: sinon.stub().resolves(false) } as never
    );

    return { usecase, createExecutionDetails };
  }

  const command = {
    organizationId: 'org_1',
    environmentId: 'env_1',
    userId: 'user_1',
    compileContext: { subscriber: { subscriberId: 'sub_1' } },
    job: {
      _id: 'job_1',
      _environmentId: 'env_1',
      _organizationId: 'org_1',
      _subscriberId: '_sub_1',
      _notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      transactionId: 'txn_1',
      identifier: 'wf-identifier',
      providerId: ChatProviderIdEnum.Telegram,
      type: ChannelTypeEnum.CHAT,
      tenant: undefined,
    },
  } as never;

  it('skips the channel with a dedicated detail when conditions do not match', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(IntegrationSelectionSkipReasonEnum.RULES_NOT_MATCHED);

    const { integration, error } = await (usecase as any).getAndValidateIntegration(
      command,
      ChatProviderIdEnum.Telegram,
      undefined,
      'roeto-support'
    );

    expect(integration).to.equal(undefined);
    expect(error.status).to.equal(SendMessageStatus.SKIPPED);
    sinon.assert.calledWithMatch(createExecutionDetails.execute, {
      detail: DetailEnum.INTEGRATION_SKIPPED_BY_CONDITIONS,
      status: ExecutionDetailsStatusEnum.WARNING,
    });
  });

  it('fails the channel with a dedicated detail when conditions are invalid', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(IntegrationSelectionSkipReasonEnum.RULES_INVALID);

    const { error } = await (usecase as any).getAndValidateIntegration(
      command,
      ChatProviderIdEnum.Telegram,
      undefined,
      'roeto-support'
    );

    expect(error.status).to.equal(SendMessageStatus.FAILED);
    sinon.assert.calledWithMatch(createExecutionDetails.execute, {
      detail: DetailEnum.INTEGRATION_CONDITIONS_INVALID,
      status: ExecutionDetailsStatusEnum.FAILED,
    });
  });

  it('keeps the missing-integration detail when nothing matched the query', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(IntegrationSelectionSkipReasonEnum.NOT_FOUND);

    const { error } = await (usecase as any).getAndValidateIntegration(
      command,
      ChatProviderIdEnum.Telegram,
      undefined,
      'roeto-support'
    );

    expect(error.status).to.equal(SendMessageStatus.FAILED);
    sinon.assert.calledWithMatch(createExecutionDetails.execute, {
      detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
    });
  });
});

describe('SendMessageChat - Slack provider content overrides', () => {
  const slackIntegration = {
    _id: 'integration_1',
    identifier: 'slack-main',
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    credentials: {},
  };

  const slackChannelData = {
    identifier: 'slack-endpoint',
    type: ENDPOINT_TYPES.SLACK_CHANNEL,
    endpoint: { channelId: 'C123' },
    token: 'xoxb-token',
  };

  const persistedBlocks = [
    { type: 'section', text: { type: 'mrkdwn', text: 'persisted section' } },
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: 'persisted context' }] },
  ];

  let originalNodeEnv: typeof process.env.NODE_ENV;

  /**
   * `BaseChatHandler.send` no-ops under `NODE_ENV=test` so suites never reach a provider API. These
   * cases assert on the exact `chat.postMessage` body, so the handler has to run for real against a
   * stubbed transport.
   */
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    sinon.restore();
  });

  function stubSlackTransport() {
    const handler = new ChatFactory().getHandler(slackIntegration as never);
    const provider = (handler as unknown as { getProvider: () => { axiosInstance?: unknown } }).getProvider();
    // Fail here rather than silently letting the suite make a real request to slack.com.
    expect(provider, 'SlackProvider no longer exposes axiosInstance').to.have.property('axiosInstance');

    const post = sinon.stub().resolves({ data: { ok: true }, headers: { 'x-slack-req-id': 'req_1' } });
    provider.axiosInstance = { post };
    sinon.stub(ChatFactory.prototype, 'getHandler').returns(handler);

    return post;
  }

  function buildUsecase() {
    const usecase = new SendMessageChat(
      {} as never, // subscriberRepository
      { create: sinon.stub().resolves({ _id: 'message_1' }) } as never,
      {} as never, // compileTemplate
      buildSelectIntegrationDouble(() => slackIntegration) as never,
      {} as never, // getNovuProviderCredentials
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      {
        execute: sinon.stub().resolves([
          {
            integrationIdentifier: 'slack-main',
            providerId: ChatProviderIdEnum.Slack,
            channelData: [slackChannelData],
          },
        ]),
      } as never,
      {} as never, // agentRepository
      {} as never, // agentIntegrationRepository
      { getFlag: sinon.stub().resolves(false) } as never // featureFlagsService
    );

    return usecase;
  }

  function buildCommand(
    options: {
      providerOverrides?: Record<string, unknown>;
      overrides?: TriggerOverrides;
      card?: Record<string, unknown>;
    } = {}
  ) {
    const { providerOverrides, overrides = {}, card } = options;

    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: overrides as never,
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: {
        subscriber: { subscriberId: 'sub_1', locale: 'en', channels: [] },
      } as never,
      bridgeData: {
        outputs: {
          body: 'compiled step body',
          ...(card ? { card } : {}),
        },
        ...(providerOverrides && { providers: { [ChatProviderIdEnum.Slack]: providerOverrides } }),
      } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.CHAT,
          content: 'compiled step body',
        },
      } as never,
      job: {
        _id: 'job_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        _subscriberId: '_sub_1',
        subscriberId: 'sub_1',
        _notificationId: 'notif_1',
        _templateId: 'tpl_1',
        transactionId: 'txn_1',
        identifier: 'wf-identifier',
        type: ChannelTypeEnum.CHAT,
        step: { stepId: 'step_1' },
      } as never,
    });
  }

  it('delivers persisted Slack provider overrides to chat.postMessage with their blocks intact', async () => {
    const post = stubSlackTransport();

    const result = await buildUsecase().execute(buildCommand({ providerOverrides: { blocks: persistedBlocks } }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(post);

    const [url, body] = post.firstCall.args;
    expect(url).to.equal('https://slack.com/api/chat.postMessage');
    expect(body.channel).to.equal('C123');
    expect(body.blocks).to.deep.equal(persistedBlocks);
  });

  it('lets a step-scoped trigger override replace the persisted blocks instead of merging them by index', async () => {
    const post = stubSlackTransport();
    const triggerBlocks = [{ type: 'header', text: { type: 'plain_text', text: 'trigger header' } }];

    const result = await buildUsecase().execute(
      buildCommand({
        providerOverrides: { blocks: persistedBlocks },
        overrides: {
          steps: { step_1: { providers: { [ChatProviderIdEnum.Slack]: { blocks: triggerBlocks } } } },
        } as unknown as TriggerOverrides,
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(post.firstCall.args[1].blocks).to.deep.equal(triggerBlocks);
  });

  it('falls back to the compiled step body as the Slack notification text when the override omits it', async () => {
    const post = stubSlackTransport();

    const result = await buildUsecase().execute(buildCommand({ providerOverrides: { blocks: persistedBlocks } }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(post.firstCall.args[1].text).to.equal('compiled step body');
  });

  function stubSlackHandlerWithCardResolve(nativePayload: Record<string, unknown>) {
    const handler = new ChatFactory().getHandler(slackIntegration as never);
    const provider = (handler as unknown as { getProvider: () => { axiosInstance?: unknown } }).getProvider();
    expect(provider, 'SlackProvider no longer exposes axiosInstance').to.have.property('axiosInstance');

    const post = sinon.stub().resolves({ data: { ok: true }, headers: { 'x-slack-req-id': 'req_1' } });
    provider.axiosInstance = { post };

    const resolveCardContent = sinon.stub(handler as never, 'resolveCardContent').resolves({
      content: 'card fallback text',
      nativePayload,
      validation: [],
    });
    sinon.stub(ChatFactory.prototype, 'getHandler').returns(handler);

    return { post, resolveCardContent };
  }

  const demoCard = {
    type: 'card',
    children: [{ type: 'text', content: 'default card body', style: 'plain' }],
  };

  it('does not send default card Block Kit when a Slack text content override is set (NV-8548)', async () => {
    const cardBlocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'default card block' } }];
    const { post, resolveCardContent } = stubSlackHandlerWithCardResolve({ blocks: cardBlocks });

    const result = await buildUsecase().execute(
      buildCommand({
        providerOverrides: { text: 'override text from providerOverrides' },
        card: demoCard,
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.notCalled(resolveCardContent);
    sinon.assert.calledOnce(post);

    const body = post.firstCall.args[1];
    expect(body.text).to.equal('override text from providerOverrides');
    expect(body.blocks).to.equal(undefined);
  });

  it('still resolves the compiled card into Block Kit when there is no content override', async () => {
    const cardBlocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'default card block' } }];
    const { post, resolveCardContent } = stubSlackHandlerWithCardResolve({ blocks: cardBlocks });

    const result = await buildUsecase().execute(buildCommand({ card: demoCard }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(resolveCardContent);
    expect(post.firstCall.args[1].text).to.equal('card fallback text');
    expect(post.firstCall.args[1].blocks).to.deep.equal(cardBlocks);
  });

  it('still resolves the compiled card when overrides are routing/metadata-only', async () => {
    const cardBlocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'default card block' } }];
    const { post, resolveCardContent } = stubSlackHandlerWithCardResolve({ blocks: cardBlocks });

    const result = await buildUsecase().execute(
      buildCommand({
        providerOverrides: {
          webhookUrl: 'https://hooks.example/override',
          'slack-endpoint': { endpoint: { channelId: 'C_OVERRIDE' } },
        },
        card: demoCard,
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(resolveCardContent);
    expect(post.firstCall.args[1].blocks).to.deep.equal(cardBlocks);
  });
});

describe('hasChatContentOverride', () => {
  it('treats primary content and native rich payloads as content overrides', () => {
    expect(hasChatContentOverride(ChatProviderIdEnum.Slack, { text: 'hi' })).to.equal(true);
    expect(hasChatContentOverride(ChatProviderIdEnum.Slack, { blocks: [] })).to.equal(true);
    expect(hasChatContentOverride(ChatProviderIdEnum.MsTeams, { attachments: [] })).to.equal(true);
  });

  it('ignores routing and metadata-only keys', () => {
    expect(hasChatContentOverride(ChatProviderIdEnum.Slack, { webhookUrl: 'https://example.com' })).to.equal(false);
    expect(
      hasChatContentOverride(ChatProviderIdEnum.Slack, {
        'slack-endpoint': { endpoint: { channelId: 'C123' } },
      })
    ).to.equal(false);
  });
});

describe('SendMessageChat - agent assigned path', () => {
  const slackUserData = {
    type: ENDPOINT_TYPES.SLACK_USER,
    identifier: 'ep_user_1',
    token: 'xoxb-test',
    endpoint: { userId: 'U123' },
  };

  const slackIntegration = {
    _id: 'integration_1',
    identifier: 'slack-main',
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    credentials: {},
  };

  afterEach(() => {
    sinon.restore();
  });

  function buildAgentUsecase(
    options: {
      channelData?: unknown[];
      linked?: boolean;
      linkedRefs?: Array<{ identifier: string; providerId: string }>;
      integration?: {
        _id: string;
        identifier: string;
        providerId: ChatProviderIdEnum;
        channel: ChannelTypeEnum;
        credentials: Record<string, unknown>;
      };
      chatHandlerSend?: sinon.SinonStub;
      updateMessage?: sinon.SinonStub;
      jobAgentId?: string | null;
      workflowAgentIdentifier?: string;
    } = {}
  ) {
    const {
      channelData = [slackUserData],
      linked = true,
      integration = slackIntegration,
      chatHandlerSend = sinon.stub().resolves({
        id: 'D123:1777837477.371619',
        date: new Date().toISOString(),
      }),
      updateMessage = sinon.stub().resolves(undefined),
      jobAgentId,
      workflowAgentIdentifier,
    } = options;
    const linkedRefs =
      options.linkedRefs ??
      (linked ? [{ identifier: integration.identifier, providerId: integration.providerId }] : []);

    sinon.stub(ChatFactory.prototype, 'getHandler').returns({
      send: chatHandlerSend,
      resolveCardContent: sinon.stub().resolves({ content: 'agent hello', nativePayload: {}, validation: [] }),
    } as never);

    const agentRepository = {
      findOne: sinon.stub().resolves(workflowAgentIdentifier ? { _id: 'agent_from_workflow' } : null),
    };
    const agentIntegrationRepository = {
      listLinkedIntegrationRefs: sinon.stub().resolves(linkedRefs),
    };
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const sendWebhookMessage = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'message_1' }),
      updateMessageStatus: sinon.stub().resolves(undefined),
      update: updateMessage,
    };
    const selectIntegration = buildSelectIntegrationDouble(() => integration);
    const featureFlagsService = {
      getFlag: sinon.stub().resolves(false),
    };

    const usecase = new SendMessageChat(
      {} as never,
      messageRepository as never,
      {} as never,
      selectIntegration as never,
      {} as never,
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never,
      createExecutionDetails as never,
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      sendWebhookMessage as never,
      {
        execute: sinon.stub().resolves([
          {
            integrationIdentifier: integration.identifier,
            providerId: integration.providerId,
            channelData,
          },
        ]),
      } as never,
      agentRepository as never,
      agentIntegrationRepository as never,
      featureFlagsService as never
    );

    return {
      usecase,
      chatHandlerSend,
      updateMessage,
      createExecutionDetails,
      sendWebhookMessage,
      messageRepository,
      agentIntegrationRepository,
      jobAgentId,
      workflowAgentIdentifier,
    };
  }

  function buildAgentCommand(options: { jobAgentId?: string | null; workflowAgentIdentifier?: string } = {}) {
    const { jobAgentId, workflowAgentIdentifier } = options;

    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: {},
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: {
        subscriber: { subscriberId: 'sub_1', locale: 'en', channels: [] },
      } as never,
      bridgeData: { outputs: { body: 'agent hello' } } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.CHAT,
          content: 'agent hello',
        },
      } as never,
      workflow: workflowAgentIdentifier ? ({ agent: { identifier: workflowAgentIdentifier } } as never) : undefined,
      job: {
        _id: 'job_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        _subscriberId: '_sub_1',
        subscriberId: 'sub_1',
        _notificationId: 'notif_1',
        _templateId: 'tpl_1',
        transactionId: 'txn_1',
        identifier: 'wf-identifier',
        type: ChannelTypeEnum.CHAT,
        step: { stepId: 'step_1' },
        ...(jobAgentId !== undefined ? { _agentId: jobAgentId } : {}),
      } as never,
    });
  }

  it('routes agent-assigned Slack delivery through ChatFactory and stamps provider identifier on message', async () => {
    const { usecase, chatHandlerSend, updateMessage } = buildAgentUsecase({ jobAgentId: 'agent_1' });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[0]).to.deep.equal({
      _id: 'message_1',
      _environmentId: 'env_1',
    });
    expect(updateMessage.firstCall.args[1]).to.deep.equal({
      $set: {
        identifier: 'D123:1777837477.371619',
        _agentId: 'agent_1',
      },
    });
  });

  it('does not stamp provider identifier when provider send fails', async () => {
    const chatHandlerSend = sinon.stub().rejects(new Error('slack down'));
    const updateMessage = sinon.stub().resolves(undefined);
    const { usecase } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      chatHandlerSend,
      updateMessage,
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.FAILED);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.notCalled(updateMessage);
  });

  it('stamps the composite provider id for Slack channel endpoints', async () => {
    const chatHandlerSend = sinon.stub().resolves({ id: 'C999:1234567890.123456', date: new Date().toISOString() });
    const { usecase, updateMessage } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      chatHandlerSend,
      channelData: [
        {
          type: ENDPOINT_TYPES.SLACK_CHANNEL,
          identifier: 'ep_channel_1',
          token: 'xoxb-test',
          endpoint: { channelId: 'C999' },
        },
      ],
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[1]).to.deep.equal({
      $set: {
        identifier: 'C999:1234567890.123456',
        _agentId: 'agent_1',
      },
    });
  });

  it('keeps send success when provider identifier stamp fails (fail-soft)', async () => {
    const updateMessage = sinon.stub().rejects(new Error('mongo unavailable'));
    const { usecase, createExecutionDetails } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      updateMessage,
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(updateMessage);
    const warningCall = createExecutionDetails.execute
      .getCalls()
      .find((call) => call.args[0]?.detail === DetailEnum.CHAT_AGENT_PLATFORM_THREAD_PERSIST_FAILED);
    expect(warningCall).to.exist;
    expect(warningCall?.args[0]?.status).to.equal(ExecutionDetailsStatusEnum.WARNING);
  });

  it('stamps identifier without agentId when job._agentId is explicitly null (opt out)', async () => {
    const { usecase, chatHandlerSend, updateMessage } = buildAgentUsecase({ jobAgentId: null });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: null }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[0]).to.deep.equal({
      _id: 'message_1',
      _environmentId: 'env_1',
    });
    expect(updateMessage.firstCall.args[1]).to.deep.equal({
      $set: { identifier: 'D123:1777837477.371619' },
    });
  });

  it('falls back to resolved channels when the integration is not linked to the assigned agent', async () => {
    const { usecase, chatHandlerSend, updateMessage, createExecutionDetails } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      linked: false,
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    sinon.assert.calledWithMatch(createExecutionDetails.execute, {
      detail: DetailEnum.CHAT_AGENT_CHANNELS_FALLBACK,
      status: ExecutionDetailsStatusEnum.WARNING,
      raw: JSON.stringify({
        message:
          "No chat channels linked to the assigned agent were available; sent using the subscriber's configured channels",
      }),
    });
  });

  it('falls back to resolved channels for agent-assigned non-Slack endpoints', async () => {
    const { usecase, chatHandlerSend, updateMessage, createExecutionDetails } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      channelData: [
        {
          type: ENDPOINT_TYPES.PHONE,
          identifier: 'ep_phone',
          endpoint: { phoneNumber: '+15551234567' },
        },
      ],
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    sinon.assert.calledWithMatch(createExecutionDetails.execute, {
      detail: DetailEnum.CHAT_AGENT_CHANNELS_FALLBACK,
      status: ExecutionDetailsStatusEnum.WARNING,
      raw: JSON.stringify({
        message:
          "No chat channels linked to the assigned agent were available; sent using the subscriber's configured channels",
      }),
    });
  });

  it('routes agent-assigned MS Teams user endpoints without the chat-channels fallback', async () => {
    const teamsActivityId = 'activity-abc123';
    const chatHandlerSend = sinon.stub().resolves({ id: teamsActivityId, date: new Date().toISOString() });
    const { usecase, updateMessage, createExecutionDetails } = buildAgentUsecase({
      jobAgentId: 'agent_1',
      chatHandlerSend,
      integration: {
        _id: 'integration_teams',
        identifier: 'msteams-main',
        providerId: ChatProviderIdEnum.MsTeams,
        channel: ChannelTypeEnum.CHAT,
        credentials: {},
      },
      channelData: [
        {
          type: ENDPOINT_TYPES.MS_TEAMS_USER,
          identifier: 'ep_teams_user',
          token: 'bot-framework-token',
          endpoint: { userId: '29:user1' },
          subscriberTenantId: 'tenant-1',
          clientId: 'client-1',
        },
      ],
    });

    const result = await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[1]).to.deep.equal({
      $set: {
        identifier: teamsActivityId,
        _agentId: 'agent_1',
      },
    });
    const fallbackWarning = createExecutionDetails.execute
      .getCalls()
      .find((call) => call.args[0]?.detail === DetailEnum.CHAT_AGENT_CHANNELS_FALLBACK);
    expect(fallbackWarning).to.equal(undefined);
  });

  it('resolves workflow.agent when job._agentId is unset and stamps with that agent', async () => {
    const { usecase, chatHandlerSend, updateMessage } = buildAgentUsecase({
      workflowAgentIdentifier: 'support-agent',
    });

    const result = await usecase.execute(buildAgentCommand({ workflowAgentIdentifier: 'support-agent' }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[1].$set._agentId).to.equal('agent_from_workflow');
  });

  it('stamps _agentId on legacy WhatsApp phone sends when an agent is assigned', async () => {
    const chatHandlerSend = sinon.stub().resolves({
      id: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI4QkY5',
      date: new Date().toISOString(),
    });
    const updateMessage = sinon.stub().resolves(undefined);
    const whatsappIntegration = {
      _id: 'integration_wa',
      identifier: 'whatsapp-main',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: { apiToken: 'token', phoneNumberIdentification: '123' },
    };

    sinon.stub(ChatFactory.prototype, 'getHandler').returns({
      send: chatHandlerSend,
      resolveCardContent: sinon.stub().resolves({ content: 'agent hello', nativePayload: {}, validation: [] }),
    } as never);

    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'message_1' }),
      updateMessageStatus: sinon.stub().resolves(undefined),
      update: updateMessage,
    };
    const selectIntegration = buildSelectIntegrationDouble((command: { providerId?: string }) =>
      command.providerId === ChatProviderIdEnum.WhatsAppBusiness ? whatsappIntegration : null
    );

    const usecase = new SendMessageChat(
      {} as never,
      messageRepository as never,
      {} as never,
      selectIntegration as never,
      {} as never,
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never,
      createExecutionDetails as never,
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      { execute: sinon.stub().resolves([]) } as never,
      { findOne: sinon.stub().resolves(null) } as never,
      {
        listLinkedIntegrationRefs: sinon
          .stub()
          .resolves([{ identifier: 'whatsapp-main', providerId: ChatProviderIdEnum.WhatsAppBusiness }]),
      } as never,
      { getFlag: sinon.stub().resolves(false) } as never
    );

    const command = buildAgentCommand({ jobAgentId: 'agent_1' });
    (command.compileContext.subscriber as { phone?: string; channels?: unknown[] }).phone = '+15551234567';
    (command.compileContext.subscriber as { channels?: unknown[] }).channels = [];

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledOnce(updateMessage);
    expect(updateMessage.firstCall.args[1]).to.deep.equal({
      $set: {
        identifier: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI4QkY5',
        _agentId: 'agent_1',
      },
    });
  });

  it('gates to the agent-linked phone provider and drops other phone channels from fan-out', async () => {
    const chatHandlerSend = sinon.stub().resolves({
      id: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI4QkY5',
      date: new Date().toISOString(),
    });
    const whatsappIntegration = {
      _id: 'integration_wa',
      identifier: 'whatsapp-main',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: { apiToken: 'token', phoneNumberIdentification: '123' },
    };

    sinon.stub(ChatFactory.prototype, 'getHandler').returns({
      send: chatHandlerSend,
      resolveCardContent: sinon.stub().resolves({ content: 'agent hello', nativePayload: {}, validation: [] }),
    } as never);

    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'message_1' }),
      updateMessageStatus: sinon.stub().resolves(undefined),
      update: sinon.stub().resolves(undefined),
    };
    // Both WhatsApp and Sendblue have active integrations selectable for this subscriber's phone.
    const selectIntegration = buildSelectIntegrationDouble((command: { providerId?: string }) => {
      if (command.providerId === ChatProviderIdEnum.WhatsAppBusiness) {
        return whatsappIntegration;
      }
      if (command.providerId === ChatProviderIdEnum.Sendblue) {
        return { ...whatsappIntegration, _id: 'integration_sb', providerId: ChatProviderIdEnum.Sendblue };
      }

      return null;
    });
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };

    const usecase = new SendMessageChat(
      {} as never,
      messageRepository as never,
      {} as never,
      selectIntegration as never,
      {} as never,
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never,
      createExecutionDetails as never,
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      { execute: sinon.stub().resolves([]) } as never,
      { findOne: sinon.stub().resolves(null) } as never,
      {
        listLinkedIntegrationRefs: sinon
          .stub()
          .resolves([{ identifier: 'whatsapp-main', providerId: ChatProviderIdEnum.WhatsAppBusiness }]),
      } as never,
      { getFlag: sinon.stub().resolves(false) } as never
    );

    const command = buildAgentCommand({ jobAgentId: 'agent_1' });
    (command.compileContext.subscriber as { phone?: string; channels?: unknown[] }).phone = '+15551234567';
    (command.compileContext.subscriber as { channels?: unknown[] }).channels = [];

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    // Only the agent-linked WhatsApp send fires — Sendblue is gated out, so no fan-out.
    sinon.assert.calledOnce(chatHandlerSend);
    const usedFallback = createExecutionDetails.execute
      .getCalls()
      .some((call) => call.args[0]?.detail === DetailEnum.CHAT_AGENT_CHANNELS_FALLBACK);
    expect(usedFallback).to.equal(false);
    expect(messageRepository.create.firstCall.args[0].providerId).to.equal(ChatProviderIdEnum.WhatsAppBusiness);
  });

  it('dispatches agent-assigned legacy WhatsApp via the linked integration, not another active WhatsApp of the same provider', async () => {
    const chatHandlerSend = sinon.stub().resolves({
      id: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI4QkY5',
      date: new Date().toISOString(),
    });
    const linkedIntegration = {
      _id: 'integration_wa_linked',
      identifier: 'whatsapp-linked',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: { apiToken: 'linked-token', phoneNumberIdentification: '111' },
    };
    const otherActiveIntegration = {
      _id: 'integration_wa_other',
      identifier: 'whatsapp-other',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: { apiToken: 'other-token', phoneNumberIdentification: '222' },
    };

    let capturedIntegration: { identifier?: string; _id?: string } | undefined;
    sinon.stub(ChatFactory.prototype, 'getHandler').callsFake((integration) => {
      capturedIntegration = integration as { identifier?: string; _id?: string };

      return {
        send: chatHandlerSend,
        resolveCardContent: sinon.stub().resolves({ content: 'agent hello', nativePayload: {}, validation: [] }),
      } as never;
    });

    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'message_1' }),
      updateMessageStatus: sinon.stub().resolves(undefined),
      update: sinon.stub().resolves(undefined),
    };
    const selectIntegration = buildSelectIntegrationDouble((command: { providerId?: string; identifier?: string }) => {
      if (command.identifier === 'whatsapp-linked') {
        return linkedIntegration;
      }
      if (command.providerId === ChatProviderIdEnum.WhatsAppBusiness) {
        return otherActiveIntegration;
      }

      return null;
    });
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };

    const usecase = new SendMessageChat(
      {} as never,
      messageRepository as never,
      {} as never,
      selectIntegration as never,
      {} as never,
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never,
      createExecutionDetails as never,
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      { execute: sinon.stub().resolves([]) } as never,
      { findOne: sinon.stub().resolves(null) } as never,
      {
        listLinkedIntegrationRefs: sinon
          .stub()
          .resolves([{ identifier: 'whatsapp-linked', providerId: ChatProviderIdEnum.WhatsAppBusiness }]),
      } as never,
      { getFlag: sinon.stub().resolves(false) } as never
    );

    const command = buildAgentCommand({ jobAgentId: 'agent_1' });
    (command.compileContext.subscriber as { phone?: string; channels?: unknown[] }).phone = '+15551234567';
    (command.compileContext.subscriber as { channels?: unknown[] }).channels = [];

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(chatHandlerSend);
    sinon.assert.calledWithMatch(selectIntegration.executeWithReason, { identifier: 'whatsapp-linked' });
    expect(capturedIntegration?.identifier).to.equal('whatsapp-linked');
    expect(capturedIntegration?._id).to.equal('integration_wa_linked');
  });

  it('persists templateIdentifier so workflow-origin hydration can name the workflow', async () => {
    const { usecase, messageRepository } = buildAgentUsecase({ jobAgentId: 'agent_1' });

    await usecase.execute(buildAgentCommand({ jobAgentId: 'agent_1' }));

    expect(messageRepository.create.firstCall.args[0].templateIdentifier).to.equal('wf-identifier');
  });
});
