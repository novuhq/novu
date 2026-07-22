import { BadRequestException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope, FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AuthService } from '../../../auth/services/auth.service';
import { SdkAgentEventsHandler } from '../../managed-runtime/sdk-agent-events.handler';
import { AgentEventSink } from '../agent-event-sink.service';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';
import { IngestAgentEvents } from './ingest-agent-events.usecase';

function envelope(overrides: Partial<AgentEventEnvelope> = {}): AgentEventEnvelope {
  return {
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
}

describe('IngestAgentEvents', () => {
  function setup() {
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
      logger as any
    );

    return {
      usecase,
      agentEventSink,
      agentRepository,
      conversationService,
      logger,
    };
  }

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

describe('SdkAgentEventsHandler', () => {
  function setup(options: { protocolEnabled?: boolean; killSwitchEnabled?: boolean } = {}) {
    const { protocolEnabled = true, killSwitchEnabled = false } = options;
    const authService = {
      getUserByApiKey: sinon.stub().resolves({
        _id: 'user-1',
        environmentId: 'env-1',
        organizationId: 'org-1',
      }),
    };
    const featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.callsFake(async ({ key }: { key: FeatureFlagsKeysEnum }) => {
      if (key === FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED) {
        return killSwitchEnabled;
      }

      if (key === FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED) {
        return protocolEnabled;
      }

      return false;
    });
    const ingestAgentEvents = {
      execute: sinon.stub().resolves({ results: [{ sequence: 1, status: 'accepted' }] }),
    };

    const handler = new SdkAgentEventsHandler(
      authService as unknown as AuthService,
      featureFlagsService,
      ingestAgentEvents as unknown as IngestAgentEvents
    );

    const req = {
      headers: { authorization: 'ApiKey test-key' },
      body: { events: [envelope()] },
    } as any;
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    } as any;

    return { handler, authService, featureFlagsService, ingestAgentEvents, req, res };
  }

  it('returns 404 when the protocol flag is disabled', async () => {
    const { handler, req, res } = setup({ protocolEnabled: false });

    await handler.handle(req, res);

    expect(res.status.calledWith(404)).to.equal(true);
  });

  it('returns 503 when the org kill-switch is enabled', async () => {
    const { handler, ingestAgentEvents, req, res } = setup({ killSwitchEnabled: true });

    await handler.handle(req, res);

    expect(res.status.calledWith(503)).to.equal(true);
    expect(ingestAgentEvents.execute.called).to.equal(false);
  });

  it('returns 401 when the API key is missing', async () => {
    const { handler, res } = setup();
    const req = { headers: {}, body: { events: [envelope()] } } as any;

    await handler.handle(req, res);

    expect(res.status.calledWith(401)).to.equal(true);
  });

  it('returns batch ack payload for authenticated requests', async () => {
    const { handler, featureFlagsService, ingestAgentEvents, req, res } = setup();

    await handler.handle(req, res);

    expect(featureFlagsService.getFlag.calledTwice).to.equal(true);
    expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
    });
    expect(featureFlagsService.getFlag.secondCall.args[0]).to.deep.include({
      key: FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED,
      defaultValue: false,
    });
    expect(ingestAgentEvents.execute.calledOnce).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({ data: { results: [{ sequence: 1, status: 'accepted' }] } })).to.equal(true);
  });
});
