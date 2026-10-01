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

    const messages = buildLiveSessionMessages({ userMessageText: 'summarize', workflowOrigin: sampleSnapshot }, parts);

    expect(messages).to.have.lengthOf(2);
    expect(messages[0].role).to.equal(MessageRole.ASSISTANT);
    expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
    expect(messages[1]).to.deep.equal({ role: MessageRole.USER, content: parts });
  });

  it('prepends thread messages the agent never saw, oldest first', () => {
    const messages = buildLiveSessionMessages({
      userMessageText: 'Nikita: ?',
      unseenThreadMessages: [
        { senderName: 'Nikita', content: 'what about hermitage ?' },
        { content: 'any thoughts on la chapelle ?' },
      ],
    });

    expect(messages).to.have.lengthOf(2);
    expect(messages[0].role).to.equal(MessageRole.ASSISTANT);
    expect(String(messages[0].content)).to.include('Nikita: what about hermitage ?');
    expect(String(messages[0].content)).to.include('any thoughts on la chapelle ?');
    expect(messages[1]).to.deep.equal({ role: MessageRole.USER, content: 'Nikita: ?' });
  });

  it('skips the unseen-thread turn when nothing was backfilled', () => {
    const messages = buildLiveSessionMessages({ userMessageText: 'hi', unseenThreadMessages: [] });

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'hi' }]);
  });

  it('keeps the origin ahead of the unseen thread messages', () => {
    const messages = buildLiveSessionMessages({
      userMessageText: 'and now?',
      workflowOrigin: sampleSnapshot,
      unseenThreadMessages: [{ senderName: 'Bob', content: 'still broken' }],
    });

    expect(messages.map((message) => message.role)).to.deep.equal([
      MessageRole.ASSISTANT,
      MessageRole.ASSISTANT,
      MessageRole.USER,
    ]);
    expect(String(messages[0].content)).to.include('Your order ORD-1 shipped');
    expect(String(messages[1].content)).to.include('Bob: still broken');
  });
});
