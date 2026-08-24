import { type ContentPart, MessageRole } from '@novu/thalamus';
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

  it('uses the resolved content parts for the user turn when provided', () => {
    const parts: ContentPart[] = [
      { type: 'image', data: 'AAAA', mediaType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ];

    const messages = buildLiveSessionMessages({ userMessageText: 'what is this?' }, parts);

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: parts }]);
  });

  it('keeps the origin as a text assistant turn while the user turn carries parts', () => {
    const parts: ContentPart[] = [{ type: 'file', data: 'AAAA', mediaType: 'application/pdf', name: 'r.pdf' }];

    const messages = buildLiveSessionMessages(
      { userMessageText: 'summarize', workflowOriginContent: 'Your order shipped' },
      parts
    );

    expect(messages).to.deep.equal([
      { role: MessageRole.ASSISTANT, content: 'Your order shipped' },
      { role: MessageRole.USER, content: parts },
    ]);
  });
});
