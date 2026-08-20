import { MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import type { WorkflowOriginSnapshot } from '../conversation-runtime/ingress/workflow-origin.helpers';
import { buildLiveSessionMessages } from './build-live-session-messages';

const sampleSnapshot: WorkflowOriginSnapshot = {
  data: {
    notificationId: 'notif-1',
    workflowIdentifier: 'order-shipped',
    messageId: 'msg-1',
    platformMessageId: 'wamid.abc',
    sentAt: '2026-01-01T00:00:00.000Z',
    body: 'Your order ORD-1 shipped',
    payload: { orderId: 'ORD-1' },
  },
  source: 'hydrated',
};

describe('buildLiveSessionMessages', () => {
  it('sends only the user turn when no origin was hydrated', () => {
    const messages = buildLiveSessionMessages({ userMessageText: 'what changed?' });

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'what changed?' }]);
  });

  it('prepends the origin as a single assistant turn ahead of the user turn', () => {
    const messages = buildLiveSessionMessages({
      userMessageText: 'why was I charged?',
      workflowOrigin: sampleSnapshot,
    });

    expect(messages).to.have.lengthOf(2);
    expect(messages[0].role).to.equal(MessageRole.ASSISTANT);
    expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
    expect(String(messages[0].content)).to.include('ORD-1');
    expect(messages[1]).to.deep.equal({ role: MessageRole.USER, content: 'why was I charged?' });
  });
});
