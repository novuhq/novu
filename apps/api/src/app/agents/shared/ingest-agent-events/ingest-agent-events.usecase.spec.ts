import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventSink } from '../agent-event-sink.service';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';
import { IngestAgentEvents } from './ingest-agent-events.usecase';

// `IngestAgentEventsCommand.events` is `Record<string, unknown>[]` (validated at the DTO
// boundary before this usecase ever sees a typed `AgentEventEnvelope`), so the helper mirrors
// that boundary with a single cast rather than typing each call site as `AgentEventEnvelope`.
function envelope(overrides: Partial<AgentEventEnvelope> = {}): Record<string, unknown> {
  const result: AgentEventEnvelope = {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: 'conv-1',
    agentId: 'support-agent',
    runId: 'run-1',
    turnId: 'turn-1',
    sequence: 1,
    timestamp: new Date().toISOString(),
    event: { type: 'message', messageId: 'msg-1', content: { markdown: 'hello' } },
    ...overrides,
  };

  return result as unknown as Record<string, unknown>;
}

describe('IngestAgentEvents', () => {
  function setup(options: { protocolEnabled?: boolean } = {}) {
    const { protocolEnabled = true } = options;
    const agentEventSink = { ingestMany: sinon.stub().resolves(['accepted']) };
    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: 'agent-mongo-1', identifier: 'support-agent' }),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ identifier: 'slack-main' }),
    };
    const conversationService = {
      getConversation: sinon.stub().resolves({
        _id: 'conv-1',
        _agentId: 'agent-mongo-1',
        channels: [{ platform: 'slack', _integrationId: 'int-1', platformThreadId: 'thread-1' }],
      }),
    };
    const featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(protocolEnabled);
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub(),
    };

    const usecase = new IngestAgentEvents(
      agentEventSink as unknown as AgentEventSink,
      agentRepository as any,
      integrationRepository as any,
      conversationService as any,
      featureFlagsService as any,
      logger as any
    );

    return {
      usecase,
      agentEventSink,
      agentRepository,
      conversationService,
      featureFlagsService,
      logger,
    };
  }

  it('returns 404 when the AgentEvent protocol flag is disabled', async () => {
    const { usecase, agentEventSink } = setup({ protocolEnabled: false });

    try {
      await usecase.execute(
        IngestAgentEventsCommand.create({
          userId: 'user-1',
          environmentId: 'env-1',
          organizationId: 'org-1',
          events: [envelope()],
        })
      );
      expect.fail('Expected NotFoundException');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
    }

    expect(agentEventSink.ingestMany.called).to.equal(false);
  });

  it('returns results for a valid batch in request order', async () => {
    const { usecase, agentEventSink } = setup();
    agentEventSink.ingestMany.resolves(['accepted', 'duplicate']);

    const result = await usecase.execute(
      IngestAgentEventsCommand.create({
        userId: 'user-1',
        environmentId: 'env-1',
        organizationId: 'org-1',
        events: [
          envelope({ sequence: 1, event: { type: 'message', messageId: 'msg-1', content: { markdown: 'one' } } }),
          envelope({ sequence: 2, event: { type: 'message', messageId: 'msg-2', content: { markdown: 'two' } } }),
        ],
      })
    );

    expect(result.results).to.deep.equal([
      { sequence: 1, status: 'accepted' },
      { sequence: 2, status: 'duplicate' },
    ]);
    expect(agentEventSink.ingestMany.calledOnce).to.equal(true);
  });

  it('returns duplicate without double dispatch when sink reports duplicate', async () => {
    const { usecase, agentEventSink } = setup();
    agentEventSink.ingestMany.resolves(['duplicate']);

    const result = await usecase.execute(
      IngestAgentEventsCommand.create({
        userId: 'user-1',
        environmentId: 'env-1',
        organizationId: 'org-1',
        events: [envelope({ sequence: 7 })],
      })
    );

    expect(result.results).to.deep.equal([{ sequence: 7, status: 'duplicate' }]);
    expect(agentEventSink.ingestMany.calledOnce).to.equal(true);
  });

  it('throws 400 when an envelope is invalid', async () => {
    const { usecase } = setup();

    try {
      await usecase.execute(
        IngestAgentEventsCommand.create({
          userId: 'user-1',
          environmentId: 'env-1',
          organizationId: 'org-1',
          events: [{ conversationId: 'conv-1' }],
        })
      );
      expect.fail('Expected BadRequestException');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.include('Invalid event envelopes at indexes: 0');
    }
  });

  it('skips and logs when agent identifier does not match conversation', async () => {
    const { usecase, agentEventSink, agentRepository, logger } = setup();
    agentRepository.findOne.resolves({ _id: 'other-agent', identifier: 'other-agent' });

    const result = await usecase.execute(
      IngestAgentEventsCommand.create({
        userId: 'user-1',
        environmentId: 'env-1',
        organizationId: 'org-1',
        events: [envelope({ sequence: 3 })],
      })
    );

    expect(result.results).to.deep.equal([]);
    expect(agentEventSink.ingestMany.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });
});
