import {
  type ConversationActivityOriginData,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';
import { MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import sinon from 'sinon';
import { type WorkflowOriginSnapshot } from '../conversation-runtime/ingress/workflow-origin.helpers';
import { ManagedAgentService } from './managed-agent.service';

const sampleOriginData: ConversationActivityOriginData = {
  notificationId: 'notif-1',
  templateId: 'wf-1',
  workflowIdentifier: 'order-shipped',
  messageId: 'msg-1',
  channel: 'chat',
  platformMessageId: 'wamid.abc',
  sentAt: '2026-01-01T00:00:00.000Z',
  payload: { orderId: 'ORD-1' },
};

const hydratedSnapshot: WorkflowOriginSnapshot = {
  content: 'Your order ORD-1 shipped',
  data: sampleOriginData,
  source: 'hydrated',
};

const existingSnapshot: WorkflowOriginSnapshot = {
  content: 'Your order ORD-1 shipped',
  data: sampleOriginData,
  source: 'existing',
};

describe('ManagedAgentService workflow-origin', () => {
  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeService(
    overrides: {
      findLatestWorkflowOrigin?: sinon.SinonStub;
      listForView?: sinon.SinonStub;
      findByPlatformMessageId?: sinon.SinonStub;
      dispatch?: sinon.SinonStub;
    } = {}
  ) {
    const conversationService = {
      findLatestWorkflowOrigin: overrides.findLatestWorkflowOrigin ?? sinon.stub().resolves(null),
      listForView: overrides.listForView ?? sinon.stub().resolves({ data: [], hasMore: false }),
      findByPlatformMessageId: overrides.findByPlatformMessageId ?? sinon.stub().resolves(null),
    };

    const service = new ManagedAgentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      conversationService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      makeLogger() as any
    );

    if (overrides.dispatch) {
      sinon.stub(service, 'dispatch').callsFake(overrides.dispatch as any);
    }

    return { service, conversationService };
  }

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      config: {
        environmentId: 'env-1',
        organizationId: 'org-1',
        agentIdentifier: 'agent-1',
        integrationIdentifier: 'integration-1',
      },
      conversation: {
        _id: 'conv-1',
        channels: [{ platformThreadId: 'thread-1' }],
      },
      subscriber: { _id: 'sub-mongo', subscriberId: 'sub-1' },
      userMessageText: 'where is my order?',
      ...overrides,
    };
  }

  describe('buildMessagesWithHistory', () => {
    it('injects origin from context on reseed with the real outbound body', async () => {
      const { service } = makeService();

      const messages = await (service as any).buildMessagesWithHistory(
        makeContext({ workflowOrigin: existingSnapshot })
      );

      expect(messages[0].role).to.equal(MessageRole.ASSISTANT);
      expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
      expect(String(messages[0].content)).to.include('ORD-1');
      expect(messages.filter((message: { role: string }) => message.role === MessageRole.USER)).to.have.lengthOf(1);
      expect(messages.at(-1)).to.deep.equal({ role: MessageRole.USER, content: 'where is my order?' });
    });

    it('keeps the collapsed prior transcript alongside the injected origin', async () => {
      // The view returns newest first.
      const listForView = sinon.stub().resolves({
        data: [
          {
            type: ConversationActivityTypeEnum.MESSAGE,
            senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
            content: 'where is my order?',
          },
          {
            type: ConversationActivityTypeEnum.MESSAGE,
            senderType: ConversationActivitySenderTypeEnum.AGENT,
            content: 'It shipped yesterday.',
          },
        ],
        hasMore: false,
      });
      const { service } = makeService({ listForView });

      const messages = await (service as any).buildMessagesWithHistory(
        makeContext({ workflowOrigin: existingSnapshot })
      );

      expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
      expect(String(messages[1].content)).to.include('It shipped yesterday.');
      expect(messages.at(-1)).to.deep.equal({ role: MessageRole.USER, content: 'where is my order?' });
    });

    it('does not re-query for origin when context already has a snapshot', async () => {
      const findLatestWorkflowOrigin = sinon.stub().resolves({
        content: 'stale',
        originData: { ...sampleOriginData, workflowIdentifier: 'stale-workflow', payload: { stale: true } },
      });
      const { service } = makeService({ findLatestWorkflowOrigin });

      const messages = await (service as any).buildMessagesWithHistory(
        makeContext({ workflowOrigin: hydratedSnapshot })
      );

      expect(findLatestWorkflowOrigin.called).to.equal(false);
      expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
      expect(String(messages[0].content)).to.not.include('stale-workflow');
    });

    it('injects the full origin payload', async () => {
      const blob = 'x'.repeat(8_000);
      const bulkySnapshot: WorkflowOriginSnapshot = {
        ...hydratedSnapshot,
        data: { ...sampleOriginData, payload: { blob, orderId: 'ORD-1' } },
      };
      const { service } = makeService();

      const messages = await (service as any).buildMessagesWithHistory(makeContext({ workflowOrigin: bulkySnapshot }));

      expect(String(messages[0].content)).to.include(blob);
      expect(String(messages[0].content)).to.include('ORD-1');
    });

    it('skips injection when context has no origin', async () => {
      const { service, conversationService } = makeService();

      const messages = await (service as any).buildMessagesWithHistory(makeContext({ workflowOrigin: undefined }));

      expect(conversationService.findLatestWorkflowOrigin.called).to.equal(false);
      expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'where is my order?' }]);
    });
  });

  describe('replayParkedInboundTurn', () => {
    it('loads the parked activity and forwards the latest origin snapshot into dispatch', async () => {
      const findByPlatformMessageId = sinon.stub().resolves({
        content: 'parked hello',
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      });
      const findLatestWorkflowOrigin = sinon.stub().resolves({
        content: 'Your order ORD-1 shipped',
        originData: sampleOriginData,
      });
      const dispatch = sinon.stub().resolves({ status: 'active' });
      const { service } = makeService({ findByPlatformMessageId, findLatestWorkflowOrigin, dispatch });

      const result = await service.replayParkedInboundTurn({
        conversation: {
          _id: 'conv-1',
          channels: [{ platformThreadId: 'thread-1' }],
        } as any,
        config: {
          environmentId: 'env-1',
          organizationId: 'org-1',
          agentIdentifier: 'agent-1',
          integrationIdentifier: 'integration-1',
        } as any,
        subscriber: { _id: 'sub-mongo', subscriberId: 'sub-1' } as any,
        pendingPlatformMessageId: 'parked-msg-1',
        agent: { _id: 'agent-mongo', managedRuntime: { providerId: 'anthropic' } } as any,
      });

      expect(result).to.deep.equal({ status: 'active' });
      expect(dispatch.calledOnce).to.equal(true);
      expect(dispatch.firstCall.args[0]).to.include({
        userMessageText: 'parked hello',
        platformMessageId: 'parked-msg-1',
        platformThreadId: 'thread-1',
      });
      expect(dispatch.firstCall.args[0].workflowOrigin).to.deep.equal(existingSnapshot);
    });

    it('returns null when the parked activity is missing', async () => {
      const { service, conversationService } = makeService();

      const result = await service.replayParkedInboundTurn({
        conversation: { _id: 'conv-1', channels: [] } as any,
        config: { environmentId: 'env-1' } as any,
        subscriber: {} as any,
        pendingPlatformMessageId: 'missing',
        agent: { _id: 'agent-mongo' } as any,
      });

      expect(result).to.equal(null);
      expect(conversationService.findByPlatformMessageId.calledOnce).to.equal(true);
    });
  });
});
