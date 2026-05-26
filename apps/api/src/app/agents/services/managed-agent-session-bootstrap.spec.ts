import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from '@novu/dal';
import { MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import { buildSessionBootstrapMessages, SESSION_RECOVERY_CONTEXT_HEADER } from './managed-agent-session-bootstrap';

function activity(
  partial: Partial<{
    senderType: ConversationActivitySenderTypeEnum;
    content: string;
    platformMessageId: string;
    createdAt: string;
  }> = {}
) {
  return {
    type: ConversationActivityTypeEnum.MESSAGE,
    senderType: partial.senderType ?? ConversationActivitySenderTypeEnum.SUBSCRIBER,
    content: partial.content ?? '',
    platformMessageId: partial.platformMessageId,
    createdAt: partial.createdAt ?? '2026-05-26T12:00:00.000Z',
  } as never;
}

describe('buildSessionBootstrapMessages', () => {
  it('returns only the current user line when there is no prior context', () => {
    const messages = buildSessionBootstrapMessages({
      activities: [activity({ content: 'Hello', platformMessageId: 'msg-1' })],
      currentPlatformMessageId: 'msg-1',
      currentText: 'Hello',
    });

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'Hello' }]);
  });

  it('packs prior assistant turns into a labeled context user message before the current line', () => {
    const messages = buildSessionBootstrapMessages({
      activities: [
        activity({
          senderType: ConversationActivitySenderTypeEnum.AGENT,
          content: 'Your Slack app is connected! Send me a message to try it out.',
          platformMessageId: 'welcome-1',
          createdAt: '2026-05-26T12:48:38.000Z',
        }),
        activity({
          content: 'Hello',
          platformMessageId: 'msg-hello',
          createdAt: '2026-05-26T12:48:49.000Z',
        }),
      ],
      currentPlatformMessageId: 'msg-hello',
      currentText: 'Hello',
    });

    expect(messages).to.have.length(2);
    expect(messages[0].role).to.equal(MessageRole.USER);
    expect(messages[0].content).to.equal(
      `${SESSION_RECOVERY_CONTEXT_HEADER}Assistant: Your Slack app is connected! Send me a message to try it out.`
    );
    expect(messages[1]).to.deep.equal({ role: MessageRole.USER, content: 'Hello' });
  });

  it('includes prior user and assistant turns in the context block for session recovery', () => {
    const messages = buildSessionBootstrapMessages({
      activities: [
        activity({
          senderType: ConversationActivitySenderTypeEnum.AGENT,
          content: 'Hi there',
          platformMessageId: 'a1',
          createdAt: '2026-05-26T12:00:00.000Z',
        }),
        activity({ content: 'Question one', platformMessageId: 'u1', createdAt: '2026-05-26T12:01:00.000Z' }),
        activity({
          senderType: ConversationActivitySenderTypeEnum.AGENT,
          content: 'Answer one',
          platformMessageId: 'a2',
          createdAt: '2026-05-26T12:02:00.000Z',
        }),
        activity({ content: 'Follow up', platformMessageId: 'u2', createdAt: '2026-05-26T12:03:00.000Z' }),
      ],
      currentPlatformMessageId: 'u2',
      currentText: 'Follow up',
    });

    expect(messages).to.have.length(2);
    expect(messages[0].content).to.contain('Assistant: Hi there');
    expect(messages[0].content).to.contain('User: Question one');
    expect(messages[0].content).to.contain('Assistant: Answer one');
    expect(messages[0].content).not.to.contain('Follow up');
    expect(messages[1].content).to.equal('Follow up');
  });
});
