import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent } from '@novu/agent-event-protocol';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';
import { IngestAgentEvents } from './ingest-agent-events.usecase';

const TURN_ID = 'conv-1:msg-1';

function envelope(event: AgentEvent, sequence = 1) {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: 'conv-1',
    agentId: 'copilot',
    runId: 'run_1',
    turnId: TURN_ID,
    sequence,
    timestamp: new Date().toISOString(),
    event,
  };
}

describe('IngestAgentEvents', () => {
  function setup({ aborted = false } = {}) {
    const agentEventSink = { ingestMany: sinon.stub().resolves() };
    const agentRepository = { findOne: sinon.stub().resolves({ _id: 'agent-db-1', identifier: 'copilot' }) };
    const integrationRepository = { findOne: sinon.stub().resolves({ identifier: 'web-chat-integration' }) };
    const conversationService = {
      getConversation: sinon.stub().resolves({
        _id: 'conv-1',
        _agentId: 'agent-db-1',
        channels: [
          { platform: AgentPlatformEnum.WEB_CHAT, _integrationId: 'integration-db-1', platformThreadId: 't1' },
        ],
      }),
    };
    const turnAbortStore = {
      isAborted: sinon.stub().resolves(aborted),
      clearActiveTurn: sinon.stub().resolves(),
    };
    const logger = { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };

    const usecase = new IngestAgentEvents(
      agentEventSink as any,
      agentRepository as any,
      integrationRepository as any,
      conversationService as any,
      turnAbortStore as any,
      logger as any
    );

    return { usecase, agentEventSink, turnAbortStore };
  }

  const command = (events: Record<string, unknown>[]) =>
    IngestAgentEventsCommand.create({ userId: 'u1', environmentId: 'env-1', organizationId: 'org-1', events });

  it('drops a stopped turn batch and tells the bridge to abort', async () => {
    const { usecase, agentEventSink, turnAbortStore } = setup({ aborted: true });

    const result = await usecase.execute(command([envelope({ type: 'run-finish', outcome: 'completed' })]));

    expect(result).to.deep.equal({ abortTurn: true });
    expect(turnAbortStore.isAborted.calledOnceWith(TURN_ID)).to.equal(true);
    expect(agentEventSink.ingestMany.called).to.equal(false);
  });

  it('ingests a running turn batch and answers with no body', async () => {
    const { usecase, agentEventSink, turnAbortStore } = setup();

    const result = await usecase.execute(command([envelope({ type: 'run-start' })]));

    expect(result).to.equal(undefined);
    expect(agentEventSink.ingestMany.calledOnce).to.equal(true);
    expect(turnAbortStore.clearActiveTurn.called).to.equal(false);
  });

  it('clears the active turn once its run finished, so a later Stop finds nothing running', async () => {
    const { usecase, turnAbortStore } = setup();

    await usecase.execute(command([envelope({ type: 'run-finish', outcome: 'completed' })]));

    expect(turnAbortStore.clearActiveTurn.calledOnceWith('conv-1', TURN_ID)).to.equal(true);
  });

  it('clears the active turn when its run failed', async () => {
    const { usecase, turnAbortStore } = setup();

    await usecase.execute(command([envelope({ type: 'run-error', message: 'boom' })]));

    expect(turnAbortStore.clearActiveTurn.calledOnceWith('conv-1', TURN_ID)).to.equal(true);
  });
});
