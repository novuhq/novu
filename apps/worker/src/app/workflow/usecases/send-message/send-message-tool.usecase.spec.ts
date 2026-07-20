import { ToolFactory } from '@novu/application-generic';
import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { isEndpointRoutedToolProvider, SendMessageTool } from './send-message-tool.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

describe('SendMessageTool - endpoint-routed providers', () => {
  /*
   * PagerDuty and Opsgenie are per-subscriber only — with no env-level
   * apiKey, the send loop must skip them (SKIPPED status + execution detail)
   * when no channel endpoint is resolved for the subscriber, rather than
   * attempting a legacy credential-based send that would throw.
   */
  it('classifies PagerDuty and Opsgenie as endpoint-routed', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.PagerDuty)).to.equal(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Opsgenie)).to.equal(true);
  });

  /*
   * The tool webhook remains credential-routed — it still routes via
   * env-level integration credentials and MUST NOT be short-circuited when a
   * subscriber has no channel endpoint. This assertion protects that provider
   * path from an accidental future addition to ENDPOINT_ROUTED_TOOL_PROVIDERS.
   */
  it('leaves the tool webhook as credential-routed', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook)).to.equal(false);
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
