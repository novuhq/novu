import { ConversationActivityTypeEnum, ConversationRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConversationActivityLedger } from './conversation-activity-ledger';
import { ConversationEventSequenceService } from './conversation-event-sequence.service';

describe('ConversationActivityLedger', () => {
  const lifecycleParams = {
    conversationId: 'conv-1',
    channel: {
      platform: 'agent_chat',
      _integrationId: 'int-1',
      platformThreadId: 'thread-1',
    },
    agentIdentifier: 'agent-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    runId: 'run-abc',
    event: { type: 'run-start' } as const,
  };

  function makeLogger() {
    return {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
    };
  }

  function makeActivityRepository(overrides: Record<string, sinon.SinonStub> = {}) {
    return {
      createRunActivity: overrides.createRunActivity ?? sinon.stub(),
      createAgentActivity:
        overrides.createAgentActivity ?? sinon.stub().resolves({ _id: 'activity-1', identifier: 'act_generated' }),
      createToolActivity: overrides.createToolActivity ?? sinon.stub().resolves({ _id: 'tool-activity' }),
      createSignalActivity: overrides.createSignalActivity ?? sinon.stub().resolves({}),
      findOne: overrides.findOne ?? sinon.stub().resolves(null),
      count: overrides.count ?? sinon.stub().resolves(0),
      ...overrides,
    };
  }

  function makeConversationRepository(overrides: Record<string, sinon.SinonStub> = {}) {
    return {
      touchActivity: overrides.touchActivity ?? sinon.stub().resolves(undefined),
      touchPreview: overrides.touchPreview ?? sinon.stub().resolves(undefined),
      ...overrides,
    };
  }

  function makeLedger(
    activityRepository = makeActivityRepository(),
    eventSequenceService = { mint: sinon.stub().resolves(7) } as unknown as ConversationEventSequenceService,
    publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) },
    conversationRepository = makeConversationRepository(),
    logger = makeLogger()
  ) {
    return new ConversationActivityLedger(
      activityRepository as any,
      eventSequenceService,
      publisher as any,
      conversationRepository as unknown as ConversationRepository,
      logger as any
    );
  }

  function basePersistParams() {
    return {
      conversationId: 'conv-1',
      channel: {
        platform: 'slack',
        _integrationId: 'integration-a',
        platformThreadId: 'thread-1',
      },
      platformMessageId: 'msg-1',
      agentIdentifier: 'agent-a',
      content: 'hello',
      environmentId: 'env-1',
      organizationId: 'org-1',
    };
  }

  describe('persistRunLifecycle', () => {
    it('stamps the minted sequence so lifecycle rows interleave with messages in order', async () => {
      const createRunActivity = sinon.stub().resolves({
        _id: 'run-1',
        type: ConversationActivityTypeEnum.RUN_START,
        sequence: 7,
      });
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };

      await makeLedger(makeActivityRepository({ createRunActivity }), undefined, publisher).persistRunLifecycle(
        lifecycleParams
      );

      expect(createRunActivity.firstCall.args[0].sequence).to.equal(7);
      expect(createRunActivity.firstCall.args[0].identifier).to.equal('run_run-abc_start');
      expect(publisher.emitPersistedClientEvent.calledOnce).to.equal(true);
    });

    it('returns null when the same run event is ingested twice and does not emit', async () => {
      const createRunActivity = sinon.stub().rejects(Object.assign(new Error('dup'), { code: 11000 }));
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };

      const activity = await makeLedger(
        makeActivityRepository({ createRunActivity }),
        undefined,
        publisher
      ).persistRunLifecycle(lifecycleParams);

      expect(activity).to.equal(null);
      expect(publisher.emitPersistedClientEvent.called).to.equal(false);
    });

    it('propagates non-duplicate write failures to the caller', async () => {
      const createRunActivity = sinon.stub().rejects(new Error('mongo down'));

      try {
        await makeLedger(makeActivityRepository({ createRunActivity })).persistRunLifecycle(lifecycleParams);
        expect.fail('expected persistRunLifecycle to reject');
      } catch (err) {
        expect((err as Error).message).to.equal('mongo down');
      }
    });
  });

  describe('persistAgentMessage', () => {
    it('uses the caller-supplied identifier when provided', async () => {
      const activityRepository = makeActivityRepository();
      const ledger = makeLedger(activityRepository);

      const result = await ledger.persistAgentMessage({
        ...basePersistParams(),
        identifier: 'client-msg-123',
      });

      expect(result.created).to.equal(true);
      expect(activityRepository.createAgentActivity.calledOnce).to.equal(true);
      expect(activityRepository.createAgentActivity.firstCall.args[0].identifier).to.equal('client-msg-123');
      expect(activityRepository.createAgentActivity.firstCall.args[0].type).to.equal(
        ConversationActivityTypeEnum.MESSAGE
      );
    });

    it('mints an act_ identifier when none is supplied', async () => {
      const activityRepository = makeActivityRepository();
      const ledger = makeLedger(activityRepository);

      await ledger.persistAgentMessage(basePersistParams());

      const identifier = activityRepository.createAgentActivity.firstCall.args[0].identifier;

      expect(identifier).to.match(/^act_/);
    });

    it('logs and returns the existing activity on duplicate identifier races', async () => {
      const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
      const existingActivity = { _id: 'existing-1', identifier: 'client-msg-123' };
      const activityRepository = makeActivityRepository({
        createAgentActivity: sinon.stub().rejects(duplicateError),
        findOne: sinon.stub().resolves(existingActivity),
      });
      const logger = makeLogger();
      const ledger = makeLedger(activityRepository, undefined, undefined, undefined, logger);

      const result = await ledger.persistAgentMessage({
        ...basePersistParams(),
        identifier: 'client-msg-123',
      });

      expect(result.activity).to.equal(existingActivity);
      expect(result.created).to.equal(false);
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('pairs touchActivity with agent message persist', async () => {
      const touchActivity = sinon.stub().resolves(undefined);
      const conversationRepository = makeConversationRepository({ touchActivity });
      const ledger = makeLedger(makeActivityRepository(), undefined, undefined, conversationRepository);

      await ledger.persistAgentMessage(basePersistParams());

      expect(touchActivity.calledOnce).to.equal(true);
    });
  });

  describe('persistWorkflowOriginHydration', () => {
    function makeHydrationParams() {
      return {
        conversationId: 'conv-1',
        channel: {
          platform: 'whatsapp',
          _integrationId: 'integration-a',
          platformThreadId: 'whatsapp:15551234567',
        },
        agentIdentifier: 'agent-a',
        environmentId: 'env-1',
        organizationId: 'org-1',
        platformMessageId: 'wamid.abc',
        platformThreadId: 'whatsapp:15551234567',
        subscriberFirstName: 'Ada',
        signalData: {
          notificationId: 'notif-1',
          workflowIdentifier: 'order-alerts',
          messageId: 'msg-1',
          subscriberId: 'sub-1',
          payload: { orderId: 'ORD-1' },
        },
      };
    }

    it('swallows duplicate-key errors from the signal write', async () => {
      const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
      const activityRepository = makeActivityRepository({
        createSignalActivity: sinon.stub().rejects(duplicateError),
      });
      const logger = makeLogger();
      const ledger = makeLedger(activityRepository, undefined, undefined, undefined, logger);

      await ledger.persistWorkflowOriginHydration(makeHydrationParams());

      expect(activityRepository.createSignalActivity.calledOnce).to.equal(true);
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[1]).to.equal('Workflow origin already hydrated');
    });

    it('rethrows non-duplicate errors from the signal write', async () => {
      const activityRepository = makeActivityRepository({
        createSignalActivity: sinon.stub().rejects(new Error('mongo timeout')),
      });
      const ledger = makeLedger(activityRepository);

      try {
        await ledger.persistWorkflowOriginHydration(makeHydrationParams());
        expect.fail('expected persistWorkflowOriginHydration to throw');
      } catch (err) {
        expect((err as Error).message).to.equal('mongo timeout');
      }
    });

    it('writes a SIGNAL activity without an agent MESSAGE row', async () => {
      const activityRepository = makeActivityRepository({
        createSignalActivity: sinon.stub().resolves({ _id: 'signal-1' }),
        createAgentActivity: sinon.stub().resolves({ _id: 'should-not-run' }),
      });
      const ledger = makeLedger(activityRepository);

      await ledger.persistWorkflowOriginHydration(makeHydrationParams());

      expect(activityRepository.createSignalActivity.calledOnce).to.equal(true);
      expect(activityRepository.createAgentActivity.called).to.equal(false);
      const args = activityRepository.createSignalActivity.firstCall.args[0];
      expect(args.identifier).to.equal('workflow-dispatch-origin:wamid.abc');
      expect(args.content).to.equal('Ada replied to the message from order-alerts');
      expect(args.signalData).to.deep.equal({
        type: 'workflow_origin',
        payload: {
          notificationId: 'notif-1',
          workflowIdentifier: 'order-alerts',
          messageId: 'msg-1',
          subscriberId: 'sub-1',
          payload: { orderId: 'ORD-1' },
        },
      });
    });

    it('falls back to the subscriber id when no first name is known', async () => {
      const activityRepository = makeActivityRepository({
        createSignalActivity: sinon.stub().resolves({ _id: 'signal-1' }),
      });
      const ledger = makeLedger(activityRepository);

      await ledger.persistWorkflowOriginHydration({ ...makeHydrationParams(), subscriberFirstName: undefined });

      expect(activityRepository.createSignalActivity.firstCall.args[0].content).to.equal(
        'sub-1 replied to the message from order-alerts'
      );
    });

    it('labels an unknown workflow identifier as unknown', async () => {
      const activityRepository = makeActivityRepository({
        createSignalActivity: sinon.stub().resolves({ _id: 'signal-1' }),
      });
      const ledger = makeLedger(activityRepository);
      const params = makeHydrationParams();

      await ledger.persistWorkflowOriginHydration({
        ...params,
        signalData: { ...params.signalData, workflowIdentifier: undefined },
      });

      expect(activityRepository.createSignalActivity.firstCall.args[0].content).to.equal(
        'Ada replied to the message from unknown'
      );
    });
  });

  describe('isWorkflowOriginHydrated', () => {
    it('matches the signal identifier written by persistWorkflowOriginHydration', async () => {
      const activityRepository = makeActivityRepository({ count: sinon.stub().resolves(1) });
      const ledger = makeLedger(activityRepository);

      const hydrated = await ledger.isWorkflowOriginHydrated('env-1', 'conv-1', 'wamid.abc');

      expect(hydrated).to.equal(true);
      expect(activityRepository.count.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env-1',
        _conversationId: 'conv-1',
        identifier: 'workflow-dispatch-origin:wamid.abc',
      });
    });

    it('returns false when the signal is absent', async () => {
      const activityRepository = makeActivityRepository({ count: sinon.stub().resolves(0) });
      const ledger = makeLedger(activityRepository);

      expect(await ledger.isWorkflowOriginHydrated('env-1', 'conv-1', 'wamid.abc')).to.equal(false);
    });
  });

  describe('MCP connection activities', () => {
    it('persists request and result activities and publishes both to agent chat', async () => {
      const activityRepository = makeActivityRepository();
      activityRepository.createAgentActivity.callsFake(async (params: Record<string, unknown>) => ({
        _id: `activity-${activityRepository.createAgentActivity.callCount}`,
        ...params,
      }));
      const mint = sinon.stub().onFirstCall().resolves(10).onSecondCall().resolves(11);
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };
      const ledger = makeLedger(activityRepository, { mint } as unknown as ConversationEventSequenceService, publisher);
      const context = {
        ...basePersistParams(),
        channel: {
          platform: 'agent_chat',
          _integrationId: 'integration-a',
          platformThreadId: 'thread-1',
        },
      };

      await ledger.persistMcpConnectionRequest({
        ...context,
        actionId: 'tool-use-1',
        mcpId: 'stripe',
        displayName: 'Stripe',
        authorizeUrl: 'https://example.com/authorize',
      });
      await ledger.persistMcpConnectionResult({
        ...context,
        actionId: 'tool-use-1',
        mcpId: 'stripe',
        status: 'connected',
      });

      expect(activityRepository.createAgentActivity.firstCall.args[0]).to.deep.include({
        identifier: 'mcp-connection:tool-use-1:request',
        type: ConversationActivityTypeEnum.MCP_CONNECTION_REQUEST,
        sequence: 10,
        richContent: {
          mcpConnection: {
            actionId: 'tool-use-1',
            mcpId: 'stripe',
            displayName: 'Stripe',
            authorizeUrl: 'https://example.com/authorize',
            authorizeUrlWithAutoApprove: undefined,
          },
        },
      });
      expect(activityRepository.createAgentActivity.secondCall.args[0]).to.deep.include({
        identifier: 'mcp-connection:tool-use-1:result',
        type: ConversationActivityTypeEnum.MCP_CONNECTION_RESULT,
        sequence: 11,
        richContent: {
          mcpConnection: {
            actionId: 'tool-use-1',
            mcpId: 'stripe',
            status: 'connected',
            message: undefined,
          },
        },
      });
      expect(publisher.emitPersistedClientEvent.callCount).to.equal(2);
    });
  });

  describe('custom activities', () => {
    it('persists an append-only custom row and publishes it on the durable path', async () => {
      const activityRepository = makeActivityRepository();
      const mint = sinon.stub().resolves(12);
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };
      const conversationRepository = makeConversationRepository();
      const ledger = makeLedger(
        activityRepository,
        { mint } as unknown as ConversationEventSequenceService,
        publisher,
        conversationRepository
      );
      const context = {
        conversationId: 'conv-1',
        channel: {
          platform: 'agent_chat',
          _integrationId: 'integration-a',
          platformThreadId: 'thread-1',
        },
        agentIdentifier: 'agent-a',
        environmentId: 'env-1',
        organizationId: 'org-1',
      };

      await ledger.persistCustom({
        ...context,
        runId: 'run-custom',
        name: 'order-progress',
        data: { pct: 70 },
      });

      expect(activityRepository.createAgentActivity.firstCall.args[0]).to.deep.include({
        type: ConversationActivityTypeEnum.CUSTOM,
        sequence: 12,
        content: 'order-progress',
        richContent: {
          custom: {
            name: 'order-progress',
            data: { pct: 70 },
            runId: 'run-custom',
          },
        },
      });
      expect(activityRepository.createAgentActivity.firstCall.args[0].identifier).to.match(/^act_/);
      expect(publisher.emitPersistedClientEvent.calledOnce).to.equal(true);
      expect(conversationRepository.touchActivity.called).to.equal(false);
      expect(conversationRepository.touchPreview.called).to.equal(false);
    });
  });

  describe('event sequencing', () => {
    it('allocates a sequence for durable tool activities on any channel', async () => {
      const activityRepository = makeActivityRepository();
      const mint = sinon.stub().resolves(4);
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };
      const ledger = makeLedger(activityRepository, { mint } as unknown as ConversationEventSequenceService, publisher);

      await ledger.persistToolResult({
        conversationId: 'conv-1',
        channel: {
          platform: 'slack',
          _integrationId: 'integration-a',
          platformThreadId: 'thread-1',
        },
        agentIdentifier: 'agent-a',
        environmentId: 'env-1',
        organizationId: 'org-1',
        toolCallId: 'tool-call-1',
        output: 'done',
      });

      expect(activityRepository.createToolActivity.firstCall.args[0].sequence).to.equal(4);
      expect(
        mint.calledOnceWithExactly({
          environmentId: 'env-1',
          organizationId: 'org-1',
          conversationId: 'conv-1',
        })
      ).to.equal(true);
      expect(publisher.emitPersistedClientEvent.calledOnce).to.equal(true);
    });
  });
});
