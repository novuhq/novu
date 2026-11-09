import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConversationParticipantTypeEnum } from '@novu/dal';
import { AgentEventEnum } from '@novu/framework/internal';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { ActiveAgentTurn } from './agent-turn-abort.store';
import { CancelConversationTurnCommand } from './cancel-conversation-turn.command';
import { CancelConversationTurn } from './cancel-conversation-turn.usecase';

const ENV_ID = 'env-1';
const ORG_ID = 'org-1';
const CONVERSATION_ID = 'conv-1';
const TURN: ActiveAgentTurn = { turnId: 'conv-1:msg-1', platformMessageId: 'msg-1', bridgeHandlesOnAbort: true };

describe('CancelConversationTurn', () => {
  function setup({
    activeTurn = TURN as ActiveAgentTurn | null,
    abortedTurns = [] as string[],
    runStartIdentifier = 'run_run_abc_start' as string | null,
    endedIdentifiers = [] as string[],
    conversationFound = true,
    agentRuntime = 'self-hosted' as string,
  } = {}) {
    const aborted = new Set(abortedTurns);
    const turnAbortStore = {
      getActiveTurn: sinon.stub().resolves(activeTurn),
      isAborted: sinon.stub().callsFake(async (turnId: string) => aborted.has(turnId)),
      // Like Redis `SET NX`: only the first call for a turn records it.
      markAborted: sinon.stub().callsFake(async (turnId: string) => {
        if (aborted.has(turnId)) return false;
        aborted.add(turnId);

        return true;
      }),
      unmarkAborted: sinon.stub().callsFake(async (turnId: string) => {
        aborted.delete(turnId);
      }),
    };
    const conversation = {
      _id: CONVERSATION_ID,
      _agentId: 'agent-db-1',
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-1' }],
      channels: [
        {
          platform: AgentPlatformEnum.WEB_CHAT,
          _integrationId: 'integration-db-1',
          platformThreadId: 'thread-1',
          firstPlatformMessageId: 'msg-0',
        },
      ],
    };
    const conversationService = {
      getConversation: sinon.stub().resolves(conversationFound ? conversation : null),
      persistRunLifecycle: sinon.stub().resolves({}),
      findOpenRunId: sinon.stub().callsFake(async () => {
        const runId = runStartIdentifier?.replace(/^run_(.+)_start$/, '$1');
        if (!runId) return undefined;

        return endedIdentifiers.includes(`run_${runId}_finish`) ? undefined : runId;
      }),
    };
    const agentRepository = { findOne: sinon.stub().resolves({ identifier: 'copilot', runtime: agentRuntime }) };
    const integrationRepository = { findOne: sinon.stub().resolves({ identifier: 'web-chat-integration' }) };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves({ subscriberId: 'sub-1' }) };
    const config = {
      agentIdentifier: 'copilot',
      integrationIdentifier: 'web-chat-integration',
      platform: AgentPlatformEnum.WEB_CHAT,
    };
    const agentConfigResolver = { resolve: sinon.stub().resolves(config) };
    const connectionContextResolver = {
      resolve: sinon.stub().resolves({ context: { tenant: { id: 'org-x' } }, bridgeUrl: undefined }),
    };
    const bridgeExecutor = { execute: sinon.stub().resolves() };
    const outboundGateway = { stopTypingInConversation: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };

    const usecase = new CancelConversationTurn(
      turnAbortStore as any,
      conversationService as any,
      agentRepository as any,
      integrationRepository as any,
      subscriberRepository as any,
      agentConfigResolver as any,
      connectionContextResolver as any,
      bridgeExecutor as any,
      outboundGateway as any,
      logger as any
    );

    return {
      usecase,
      turnAbortStore,
      conversationService,
      bridgeExecutor,
      outboundGateway,
      connectionContextResolver,
      aborted,
    };
  }

  const command = () =>
    CancelConversationTurnCommand.create({
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      conversationId: CONVERSATION_ID,
      contextKeys: ['tenant:org-x'],
    });

  it('marks the active turn aborted and finishes its open run as aborted under the run finish identifier', async () => {
    const { usecase, aborted, conversationService } = setup();

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'aborted' });
    expect(aborted.has(TURN.turnId)).to.equal(true);
    expect(conversationService.persistRunLifecycle.calledOnce).to.equal(true);
    const persisted = conversationService.persistRunLifecycle.firstCall.args[0];
    expect(persisted.runId).to.equal('run_abc');
    expect(persisted.agentIdentifier).to.equal('copilot');
    expect(persisted.event).to.deep.equal({ type: 'run-finish', outcome: 'aborted' });
  });

  it('looks for the open run among the runs the stopped turn started after its message', async () => {
    const { usecase, conversationService } = setup();

    await usecase.execute(command());

    expect(conversationService.findOpenRunId.firstCall.args[0]).to.deep.equal({
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      conversationId: CONVERSATION_ID,
      turnMessageId: TURN.platformMessageId,
    });
  });

  it('gives a turn stopped before its run started an aborted run of its own', async () => {
    const { usecase, conversationService } = setup({ endedIdentifiers: ['run_run_abc_finish'] });

    await usecase.execute(command());

    expect(conversationService.persistRunLifecycle.firstCall.args[0].runId).to.equal(`stopped_${TURN.turnId}`);
  });

  it('does the same when the conversation has never run', async () => {
    const { usecase, conversationService } = setup({ runStartIdentifier: null });

    await usecase.execute(command());

    expect(conversationService.persistRunLifecycle.firstCall.args[0].runId).to.equal(`stopped_${TURN.turnId}`);
  });

  it('stops typing and sends onAbort with the stopped turn and the session context', async () => {
    const { usecase, bridgeExecutor, outboundGateway, connectionContextResolver } = setup();

    await usecase.execute(command());

    expect(
      outboundGateway.stopTypingInConversation.calledOnceWith('agent-db-1', 'web-chat-integration', 'thread-1')
    ).to.equal(true);
    expect(connectionContextResolver.resolve.firstCall.args[1]).to.deep.equal({ contextKeys: ['tenant:org-x'] });
    const params = bridgeExecutor.execute.firstCall.args[0];
    expect(params.event).to.equal(AgentEventEnum.ON_ABORT);
    expect(params.abortedTurn).to.deep.equal(TURN);
    expect(params.context).to.deep.equal({ tenant: { id: 'org-x' } });
    expect(params.message).to.equal(null);
  });

  it('stops the turn but sends no onAbort to a bridge that did not list it among the events it handles', async () => {
    const { usecase, aborted, conversationService, bridgeExecutor, outboundGateway } = setup({
      activeTurn: { turnId: TURN.turnId, platformMessageId: TURN.platformMessageId },
    });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'aborted' });
    expect(aborted.has(TURN.turnId)).to.equal(true);
    expect(conversationService.persistRunLifecycle.firstCall.args[0].event).to.deep.equal({
      type: 'run-finish',
      outcome: 'aborted',
    });
    expect(outboundGateway.stopTypingInConversation.calledOnce).to.equal(true);
    expect(bridgeExecutor.execute.called).to.equal(false);
  });

  it('returns idle and touches nothing when no turn is running', async () => {
    const { usecase, turnAbortStore, conversationService, bridgeExecutor } = setup({ activeTurn: null });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'idle' });
    expect(turnAbortStore.markAborted.called).to.equal(false);
    expect(conversationService.persistRunLifecycle.called).to.equal(false);
    expect(bridgeExecutor.execute.called).to.equal(false);
  });

  it('refuses to report idle while a managed agent run, which it cannot stop, is open', async () => {
    const { usecase, conversationService } = setup({ activeTurn: null, agentRuntime: 'managed' });

    let error: unknown;
    try {
      await usecase.execute(command());
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(UnprocessableEntityException);
    expect(conversationService.findOpenRunId.firstCall.args[0]).to.deep.equal({
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      conversationId: CONVERSATION_ID,
    });
    expect(conversationService.persistRunLifecycle.called).to.equal(false);
  });

  it('returns idle for a managed agent with no open run', async () => {
    const { usecase } = setup({ activeTurn: null, agentRuntime: 'managed', runStartIdentifier: null });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'idle' });
  });

  it('is idempotent: a repeated Stop of an aborted turn persists and dispatches nothing more', async () => {
    const { usecase, conversationService, bridgeExecutor } = setup({ abortedTurns: [TURN.turnId] });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'aborted' });
    expect(conversationService.persistRunLifecycle.called).to.equal(false);
    expect(bridgeExecutor.execute.called).to.equal(false);
  });

  it('ends the run and sends onAbort once for two Stops at the same time', async () => {
    const { usecase, conversationService, bridgeExecutor } = setup();

    const results = await Promise.all([usecase.execute(command()), usecase.execute(command())]);

    expect(results).to.deep.equal([{ status: 'aborted' }, { status: 'aborted' }]);
    expect(conversationService.persistRunLifecycle.callCount).to.equal(1);
    expect(bridgeExecutor.execute.callCount).to.equal(1);
  });

  it('lets a retried Stop end the run when the first could not record the aborted finish', async () => {
    const { usecase, conversationService, bridgeExecutor, aborted } = setup();
    conversationService.persistRunLifecycle.onFirstCall().rejects(new Error('mongo down'));

    let error: unknown;
    try {
      await usecase.execute(command());
    } catch (err) {
      error = err;
    }

    expect((error as Error)?.message).to.equal('mongo down');
    expect(aborted.has(TURN.turnId)).to.equal(false);
    expect(bridgeExecutor.execute.called).to.equal(false);

    const retry = await usecase.execute(command());

    expect(retry).to.deep.equal({ status: 'aborted' });
    expect(conversationService.persistRunLifecycle.callCount).to.equal(2);
    expect(conversationService.persistRunLifecycle.secondCall.args[0].event).to.deep.equal({
      type: 'run-finish',
      outcome: 'aborted',
    });
    expect(bridgeExecutor.execute.calledOnce).to.equal(true);
  });

  it('still stops the turn when the onAbort dispatch fails', async () => {
    const { usecase, bridgeExecutor } = setup();
    bridgeExecutor.execute.rejects(new Error('bridge down'));

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ status: 'aborted' });
  });

  it('throws not found for a conversation outside the environment', async () => {
    const { usecase } = setup({ conversationFound: false });

    let error: unknown;
    try {
      await usecase.execute(command());
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(NotFoundException);
  });
});
