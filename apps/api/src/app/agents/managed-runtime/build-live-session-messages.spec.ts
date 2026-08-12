import { MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import { buildLiveSessionMessages } from './build-live-session-messages';

describe('buildLiveSessionMessages', () => {
  it('sends only the user turn when no origin was hydrated', () => {
    const messages = buildLiveSessionMessages({ userMessageText: 'what changed?' });

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'what changed?' }]);
  });

  it('ignores an empty origin summary', () => {
    const messages = buildLiveSessionMessages({ userMessageText: 'what changed?', workflowOriginContent: '' });

    expect(messages).to.have.lengthOf(1);
    expect(messages[0].role).to.equal(MessageRole.USER);
  });

  it('prepends the origin as a single assistant turn ahead of the user turn', () => {
    const messages = buildLiveSessionMessages({
      userMessageText: 'why was I charged?',
      workflowOriginContent: 'Your order shipped',
    });

    expect(messages).to.deep.equal([
      { role: MessageRole.ASSISTANT, content: 'Your order shipped' },
      { role: MessageRole.USER, content: 'why was I charged?' },
    ]);
  });

  it('keeps exactly one user row so the session emits a single live turn', () => {
    const messages = buildLiveSessionMessages({
      userMessageText: 'why was I charged?',
      workflowOriginContent: 'Your order shipped',
    });

    expect(messages.filter((message) => message.role === MessageRole.USER)).to.have.lengthOf(1);
  });
});
