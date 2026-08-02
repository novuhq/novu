import { ChatProviderIdEnum, ENDPOINT_TYPES, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon, { restore, stub } from 'sinon';
import { NotifyWorkflowAgentDispatchCommand } from './notify-workflow-agent-dispatch.command';
import { NotifyWorkflowAgentDispatch } from './notify-workflow-agent-dispatch.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const USER_ID = 'user-id';
const AGENT_ID = 'agent-mongo-id';
const AGENT_IDENTIFIER = 'my-agent';
const INTEGRATION_ID = 'integration-id';
const INTEGRATION_IDENTIFIER = 'slack-main';

function buildCommand(overrides: Partial<NotifyWorkflowAgentDispatchCommand> = {}) {
  return NotifyWorkflowAgentDispatchCommand.create({
    userId: USER_ID,
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentId: AGENT_IDENTIFIER,
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    destination: { type: ENDPOINT_TYPES.SLACK_USER, userId: 'U123' },
    content: 'Hello from workflow',
    idempotencyKey: 'msg-1:endpoint-1',
    origin: {
      notificationId: '507f1f77bcf86cd799439011',
      jobId: '507f1f77bcf86cd799439012',
      messageId: '507f1f77bcf86cd799439013',
      transactionId: 'txn-1',
      workflowIdentifier: 'welcome-workflow',
      subscriberId: 'sub-1',
    },
    ...overrides,
  });
}

describe('NotifyWorkflowAgentDispatch usecase', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let workflowAgentDispatchRepository: {
    reservePending: sinon.SinonStub;
    markSent: sinon.SinonStub;
    markFailed: sinon.SinonStub;
  };
  let outboundGateway: {
    sendDirectMessage: sinon.SinonStub;
    sendChannelMessage: sinon.SinonStub;
  };
  let logger: { setContext: sinon.SinonStub; error: sinon.SinonStub };

  function buildUsecase() {
    return new NotifyWorkflowAgentDispatch(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      workflowAgentDispatchRepository as any,
      outboundGateway as any,
      logger as any
    );
  }

  beforeEach(() => {
    agentRepository = {
      findOne: stub(),
    };
    agentRepository.findOne.onFirstCall().resolves({ _id: AGENT_ID, identifier: AGENT_IDENTIFIER });

    integrationRepository = {
      findOne: stub().resolves({
        _id: INTEGRATION_ID,
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.Slack,
      }),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    workflowAgentDispatchRepository = {
      reservePending: stub().resolves({
        _id: 'dispatch-1',
        status: WorkflowAgentDispatchStatusEnum.PENDING,
        content: 'Hello from workflow',
      }),
      markSent: stub().resolves(undefined),
      markFailed: stub().resolves(undefined),
    };
    outboundGateway = {
      sendDirectMessage: stub().resolves({ messageId: 'ts-1', platformThreadId: 'slack:D123:ts-1' }),
      sendChannelMessage: stub().resolves({ messageId: 'ts-2', platformThreadId: 'slack:C123:ts-2' }),
    };
    logger = {
      setContext: stub(),
      error: stub(),
    };
  });

  afterEach(() => {
    restore();
  });

  it('sends a Slack DM and marks the dispatch sent', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({
      dispatchId: 'dispatch-1',
      platformMessageId: 'ts-1',
      platformThreadId: 'slack:D123:ts-1',
      status: WorkflowAgentDispatchStatusEnum.SENT,
    });
    expect(outboundGateway.sendDirectMessage.calledOnce).to.equal(true);
    expect(outboundGateway.sendDirectMessage.firstCall.args[0]).to.equal(AGENT_ID);
    expect(outboundGateway.sendDirectMessage.firstCall.args[2]).to.equal('U123');
    expect(workflowAgentDispatchRepository.markSent.calledOnce).to.equal(true);
    expect(workflowAgentDispatchRepository.markSent.firstCall.args[0]).to.include({
      dispatchId: 'dispatch-1',
      platformMessageId: 'ts-1',
      platformThreadId: 'slack:D123:ts-1',
    });
  });

  it('sends a Slack channel message via sendChannelMessage', async () => {
    const result = await buildUsecase().execute(
      buildCommand({
        destination: { type: ENDPOINT_TYPES.SLACK_CHANNEL, channelId: 'C123' },
      })
    );

    expect(result.platformThreadId).to.equal('slack:C123:ts-2');
    expect(outboundGateway.sendChannelMessage.calledOnce).to.equal(true);
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
  });

  it('returns existing sent dispatch without re-sending (idempotent)', async () => {
    workflowAgentDispatchRepository.reservePending.resolves({
      _id: 'dispatch-1',
      status: WorkflowAgentDispatchStatusEnum.SENT,
      platformMessageId: 'ts-existing',
      platformThreadId: 'slack:D123:ts-existing',
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.platformMessageId).to.equal('ts-existing');
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(workflowAgentDispatchRepository.markSent.called).to.equal(false);
  });

  it('rejects when the integration is not linked to the agent', async () => {
    agentIntegrationRepository.findOne.resolves(null);

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('expected BadRequestException');
    } catch (error) {
      expect((error as Error).message).to.include('is not linked to agent');
    }

    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
  });

  it('rejects non-Slack integrations', async () => {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      identifier: INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Discord,
    });

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('expected BadRequestException');
    } catch (error) {
      expect((error as Error).message).to.include('Slack only');
    }
  });

  it('marks failed and rethrows when outbound send fails', async () => {
    outboundGateway.sendDirectMessage.rejects(new Error('slack down'));

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('expected error');
    } catch (error) {
      expect((error as Error).message).to.equal('slack down');
    }

    expect(workflowAgentDispatchRepository.markFailed.calledOnce).to.equal(true);
  });
});
