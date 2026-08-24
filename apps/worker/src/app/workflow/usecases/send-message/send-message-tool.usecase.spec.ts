import { ToolFactory } from '@novu/application-generic';
import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { isEndpointRoutedToolProvider, SendMessageTool } from './send-message-tool.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

describe('SendMessageTool - endpoint-routed providers', () => {
  it('classifies PagerDuty, Opsgenie, and Grafana as endpoint-routed regardless of credentials', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.PagerDuty)).to.equal(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Opsgenie)).to.equal(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Grafana)).to.equal(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.PagerDuty, { routingMode: 'static' })).to.equal(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Grafana, { routingMode: 'static' })).to.equal(true);
  });

  it('treats the tool webhook as credential-routed when routingMode is missing or static', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook)).to.equal(false);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook, {})).to.equal(false);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook, { routingMode: 'static' })).to.equal(false);
  });

  it('treats the tool webhook as endpoint-routed when routingMode is dynamic', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook, { routingMode: 'dynamic' })).to.equal(true);
  });
});

describe('SendMessageTool - Opsgenie endpoint-routed send path', () => {
  const opsgenieIntegration = {
    _id: 'integration_1',
    identifier: 'opsgenie-main',
    providerId: ToolProviderIdEnum.Opsgenie,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
  };

  const opsgenieChannelData = {
    type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
    identifier: 'opsgenie-endpoint',
    endpoint: { apiKey: 'genie-key-123', region: 'eu' as const },
  };

  function buildUsecase(overrides: { endpointGroups?: unknown[] } = {}) {
    const { endpointGroups = [] } = overrides;

    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = { create: sinon.stub().resolves({ _id: 'message_1' }) };
    const getDecryptedIntegrations = { execute: sinon.stub().resolves([opsgenieIntegration]) };
    const resolveChannelEndpoints = { execute: sinon.stub().resolves(endpointGroups) };

    const usecase = new SendMessageTool(
      {} as never, // subscriberRepository
      messageRepository as never,
      createExecutionDetails as never,
      {} as never, // compileTemplate
      {} as never, // selectIntegration
      {} as never, // getNovuProviderCredentials
      {} as never, // selectVariant
      {} as never, // moduleRef
      getDecryptedIntegrations as never,
      resolveChannelEndpoints as never
    );

    return { usecase, createExecutionDetails, messageRepository };
  }

  function buildCommand() {
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
        subscriber: { subscriberId: 'sub_1', locale: 'en' },
      } as never,
      bridgeData: { outputs: { body: 'alert body' } } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.TOOL,
          content: 'alert body',
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
        type: ChannelTypeEnum.TOOL,
        step: { stepId: 'step_1' },
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('skips the Opsgenie integration with an execution detail when no channel endpoint is resolved', async () => {
    const { usecase, createExecutionDetails, messageRepository } = buildUsecase({ endpointGroups: [] });

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SKIPPED);
    sinon.assert.notCalled(messageRepository.create);

    const skipDetail = createExecutionDetails.execute
      .getCalls()
      .map((call) => call.args[0])
      .find((arg) => typeof arg.raw === 'string' && arg.raw.includes('no_channel_endpoint_for_subscriber'));
    expect(skipDetail, 'expected a no_channel_endpoint_for_subscriber execution detail').to.exist;
    expect(JSON.parse(skipDetail.raw)).to.deep.include({
      integrationIdentifier: 'opsgenie-main',
      providerId: ToolProviderIdEnum.Opsgenie,
    });
  });

  it('passes channelData and routing context to the provider send when an endpoint exists', async () => {
    const { usecase } = buildUsecase({
      endpointGroups: [
        {
          integrationIdentifier: 'opsgenie-main',
          providerId: ToolProviderIdEnum.Opsgenie,
          channelData: [opsgenieChannelData],
        },
      ],
    });
    const sendStub = sinon.stub().resolves({ id: 'alert_1' });
    sinon.stub(ToolFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(sendStub);

    const sendArgs = sendStub.firstCall.args[0];
    expect(sendArgs.channelData).to.deep.equal(opsgenieChannelData);
    expect(sendArgs.transactionId).to.equal('txn_1');
    expect(sendArgs.subscriberId).to.equal('sub_1');
    expect(sendArgs.stepId).to.equal('step_1');
    expect(sendArgs.content).to.equal('alert body');
  });
});

describe('SendMessageTool - Webhook static vs dynamic routing', () => {
  const webhookChannelData = {
    type: ENDPOINT_TYPES.TOOL_WEBHOOK,
    identifier: 'webhook-endpoint',
    endpoint: { url: 'https://hooks.example.com/inbound' },
  };

  function buildWebhookIntegration(routingMode?: 'static' | 'dynamic', identifier = 'webhook-main') {
    return {
      _id: 'integration_1',
      identifier,
      providerId: ToolProviderIdEnum.Webhook,
      channel: ChannelTypeEnum.TOOL,
      credentials: routingMode ? { routingMode } : {},
    };
  }

  function buildUsecase(overrides: { integration: unknown | unknown[]; endpointGroups?: unknown[] }) {
    const { integration, endpointGroups = [] } = overrides;

    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = { create: sinon.stub().resolves({ _id: 'message_1' }) };
    const integrations = Array.isArray(integration) ? integration : [integration];
    const getDecryptedIntegrations = { execute: sinon.stub().resolves(integrations) };
    const resolveChannelEndpoints = { execute: sinon.stub().resolves(endpointGroups) };

    const usecase = new SendMessageTool(
      {} as never, // subscriberRepository
      messageRepository as never,
      createExecutionDetails as never,
      {} as never, // compileTemplate
      {} as never, // selectIntegration
      {} as never, // getNovuProviderCredentials
      {} as never, // selectVariant
      {} as never, // moduleRef
      getDecryptedIntegrations as never,
      resolveChannelEndpoints as never
    );

    return { usecase, createExecutionDetails, messageRepository };
  }

  function buildCommand() {
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
        subscriber: { subscriberId: 'sub_1', locale: 'en' },
      } as never,
      bridgeData: { outputs: { body: 'webhook body' } } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.TOOL,
          content: 'webhook body',
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
        type: ChannelTypeEnum.TOOL,
        step: { stepId: 'step_1' },
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('sends once with channelData undefined for static routing, ignoring any endpoints that exist', async () => {
    const { usecase } = buildUsecase({
      integration: buildWebhookIntegration('static'),
      endpointGroups: [
        {
          integrationIdentifier: 'webhook-main',
          providerId: ToolProviderIdEnum.Webhook,
          channelData: [webhookChannelData],
        },
      ],
    });
    const sendStub = sinon.stub().resolves({ status: 200 });
    sinon.stub(ToolFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(sendStub);
    expect(sendStub.firstCall.args[0].channelData).to.equal(undefined);
  });

  it('sends once with channelData undefined when routingMode is missing (defaults to static)', async () => {
    const { usecase } = buildUsecase({ integration: buildWebhookIntegration() });
    const sendStub = sinon.stub().resolves({ status: 200 });
    sinon.stub(ToolFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(sendStub);
    expect(sendStub.firstCall.args[0].channelData).to.equal(undefined);
  });

  it('skips with an execution detail for dynamic routing when no channel endpoint is resolved', async () => {
    const { usecase, createExecutionDetails, messageRepository } = buildUsecase({
      integration: buildWebhookIntegration('dynamic'),
      endpointGroups: [],
    });

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SKIPPED);
    sinon.assert.notCalled(messageRepository.create);

    const skipDetail = createExecutionDetails.execute
      .getCalls()
      .map((call) => call.args[0])
      .find((arg) => typeof arg.raw === 'string' && arg.raw.includes('no_channel_endpoint_for_subscriber'));
    expect(skipDetail, 'expected a no_channel_endpoint_for_subscriber execution detail').to.exist;
    expect(JSON.parse(skipDetail.raw)).to.deep.include({
      integrationIdentifier: 'webhook-main',
      providerId: ToolProviderIdEnum.Webhook,
    });
  });

  it('fans out one send per channel endpoint for dynamic routing', async () => {
    const secondChannelData = {
      type: ENDPOINT_TYPES.TOOL_WEBHOOK,
      identifier: 'webhook-endpoint-2',
      endpoint: { url: 'https://hooks.example.com/second' },
    };
    const { usecase } = buildUsecase({
      integration: buildWebhookIntegration('dynamic'),
      endpointGroups: [
        {
          integrationIdentifier: 'webhook-main',
          providerId: ToolProviderIdEnum.Webhook,
          channelData: [webhookChannelData, secondChannelData],
        },
      ],
    });
    const sendStub = sinon.stub().resolves({ status: 200 });
    sinon.stub(ToolFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledTwice(sendStub);
    expect(sendStub.firstCall.args[0].channelData).to.deep.equal(webhookChannelData);
    expect(sendStub.secondCall.args[0].channelData).to.deep.equal(secondChannelData);
  });

  it('passes the same provider override to static integrations and dynamic endpoint fan-out', async () => {
    const secondChannelData = {
      type: ENDPOINT_TYPES.TOOL_WEBHOOK,
      identifier: 'webhook-endpoint-2',
      endpoint: { url: 'https://hooks.example.com/second' },
    };
    const { usecase } = buildUsecase({
      integration: [
        buildWebhookIntegration('static', 'webhook-static'),
        buildWebhookIntegration('dynamic', 'webhook-dynamic'),
      ],
      endpointGroups: [
        {
          integrationIdentifier: 'webhook-dynamic',
          providerId: ToolProviderIdEnum.Webhook,
          channelData: [webhookChannelData, secondChannelData],
        },
      ],
    });
    const sendStub = sinon.stub().resolves({ status: 200 });
    sinon.stub(ToolFactory.prototype, 'getHandler').returns({ send: sendStub } as never);
    const command = buildCommand();
    if (!command.bridgeData) {
      throw new Error('Expected bridge data');
    }
    command.bridgeData = {
      ...command.bridgeData,
      providers: {
        [ToolProviderIdEnum.Webhook]: { alert_type: 'incident', priority: 'high' },
      },
    };

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.callCount(sendStub, 3);
    for (const call of sendStub.getCalls()) {
      expect(call.args[0].bridgeProviderData).to.deep.equal({
        alert_type: 'incident',
        priority: 'high',
      });
    }
  });
});
