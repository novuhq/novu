import { ChatFactory } from '@novu/application-generic';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, TriggerOverrides } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

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
    const selectIntegration = {
      execute: sinon.stub().callsFake(async (command: { providerId: ChatProviderIdEnum }) => {
        return activePhoneProviders.includes(command.providerId) ? { providerId: command.providerId } : null;
      }),
    };

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
      resolveChannelEndpoints as never
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

  let originalNodeEnv: string | undefined;

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
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    sinon.restore();
  });

  function stubSlackTransport() {
    const handler = new ChatFactory().getHandler(slackIntegration as never);
    const post = sinon.stub().resolves({ data: { ok: true }, headers: { 'x-slack-req-id': 'req_1' } });
    (handler as unknown as { provider: { axiosInstance: unknown } }).provider.axiosInstance = { post };
    sinon.stub(ChatFactory.prototype, 'getHandler').returns(handler);

    return post;
  }

  function buildUsecase() {
    const usecase = new SendMessageChat(
      {} as never, // subscriberRepository
      { create: sinon.stub().resolves({ _id: 'message_1' }) } as never,
      {} as never, // compileTemplate
      { execute: sinon.stub().resolves(slackIntegration) } as never,
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
      } as never
    );

    return usecase;
  }

  function buildCommand(options: { providerOverrides?: Record<string, unknown>; overrides?: TriggerOverrides } = {}) {
    const { providerOverrides, overrides = {} } = options;

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
        outputs: { body: 'compiled step body' },
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
        } as TriggerOverrides,
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

  it('lets an override text win over the compiled step body', async () => {
    const post = stubSlackTransport();

    const result = await buildUsecase().execute(
      buildCommand({ providerOverrides: { text: 'override text', blocks: persistedBlocks } })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(post.firstCall.args[1].text).to.equal('override text');
  });
});
