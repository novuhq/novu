import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { collectSlackThreadHistoryMessages, seedSlackThreadHistory } from './seed-slack-thread-history';

function asyncMessages(messages: Array<{ id: string; text?: string; author?: Record<string, unknown> }>) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const message of messages) {
        yield message;
      }
    },
  };
}

function slackMessage(
  id: string,
  text: string,
  author: { userId: string; fullName?: string; isBot?: boolean | 'unknown' } = {
    userId: 'U1',
    fullName: 'Ada',
    isBot: false,
  },
  raw?: Record<string, unknown>
) {
  return { id, text, author, raw };
}

describe('seedSlackThreadHistory', () => {
  describe('collectSlackThreadHistoryMessages', () => {
    it('returns prior messages oldest-first, skipping newer messages, the origin, and empty text', async () => {
      const collected = await collectSlackThreadHistoryMessages({
        thread: {
          messages: asyncMessages([
            slackMessage('after-mention', 'posted while processing'),
            slackMessage('mention', '@bot help'),
            slackMessage('empty', '   '),
            slackMessage('later', 'later'),
            slackMessage('origin', 'Order shipped'),
            slackMessage('middle', 'middle'),
            slackMessage('oldest', 'oldest'),
          ]),
        } as any,
        currentMessageId: 'mention',
        originPlatformMessageId: 'origin',
      });

      expect(collected.map((message) => message.id)).to.deep.equal(['oldest', 'middle', 'later']);
    });

    it('keeps the newest messages when the thread exceeds the limit', async () => {
      const newestFirst = Array.from({ length: 55 }, (_, index) => slackMessage(`m${index}`, `text ${index}`));
      const collected = await collectSlackThreadHistoryMessages({
        thread: { messages: asyncMessages([slackMessage('mention', '@bot help'), ...newestFirst]) } as any,
        currentMessageId: 'mention',
        limit: 3,
      });

      expect(collected.map((message) => message.id)).to.deep.equal(['m2', 'm1', 'm0']);
    });

    it('returns an empty list when the thread has no messages iterator', async () => {
      const collected = await collectSlackThreadHistoryMessages({
        thread: {} as any,
        currentMessageId: 'mention',
      });

      expect(collected).to.deep.equal([]);
    });

    it('returns no history when the current message is absent from the fetched thread', async () => {
      const collected = await collectSlackThreadHistoryMessages({
        thread: { messages: asyncMessages([slackMessage('older', 'older')]) } as any,
        currentMessageId: 'mention',
      });

      expect(collected).to.deep.equal([]);
    });
  });

  describe('seedSlackThreadHistory', () => {
    const config = {
      platform: AgentPlatformEnum.SLACK,
      integrationId: 'int1',
      environmentId: 'env1',
      organizationId: 'org1',
    };

    it('imports prior messages once and leaves all unmatched authors as platform users', async () => {
      const importInboundMessages = sinon.stub().resolves(2);
      const logger = { warn: sinon.stub() };
      const mention = slackMessage('mention', '@bot help', undefined, { type: 'app_mention' });

      await seedSlackThreadHistory({
        agentId: 'agent1',
        config: config as any,
        conversation: { _id: 'conv1' } as any,
        thread: {
          messages: asyncMessages([
            mention,
            slackMessage('human', 'can you look?', { userId: 'U9', fullName: 'Ada', isBot: false }),
            slackMessage('bot', 'I posted this', { userId: 'B1', fullName: 'Bot', isBot: true }),
          ]),
        } as any,
        message: mention as any,
        platformThreadId: 'slack:C1:1.0',
        conversationService: { importInboundMessages },
        logger,
      });

      expect(importInboundMessages.calledOnce).to.equal(true);
      expect(importInboundMessages.firstCall.args[0]).to.include({
        platformThreadId: 'slack:C1:1.0',
      });
      expect(importInboundMessages.firstCall.args[0].messages).to.deep.equal([
        {
          senderId: 'slack:B1',
          senderName: 'Bot',
          content: 'I posted this',
          platformMessageId: 'bot',
          identifier: 'slack_hist_conv1_bot',
        },
        {
          senderId: 'slack:U9',
          senderName: 'Ada',
          content: 'can you look?',
          platformMessageId: 'human',
          identifier: 'slack_hist_conv1_human',
        },
      ]);
    });

    it('swallows fetch errors so the mention still proceeds', async () => {
      const importInboundMessages = sinon.stub().resolves(0);
      const logger = { warn: sinon.stub() };
      const mention = slackMessage('mention', '@bot help', undefined, { type: 'app_mention' });

      await seedSlackThreadHistory({
        agentId: 'agent1',
        config: config as any,
        conversation: { _id: 'conv1' } as any,
        thread: {
          messages: {
            [Symbol.asyncIterator]: () => {
              throw new Error('slack down');
            },
          },
        } as any,
        message: mention as any,
        platformThreadId: 'slack:C1:1.0',
        conversationService: { importInboundMessages },
        logger,
      });

      expect(importInboundMessages.called).to.equal(false);
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('does nothing for non-mention Slack messages', async () => {
      const importInboundMessages = sinon.stub();
      const message = slackMessage('message', 'hello', undefined, { type: 'message' });

      await seedSlackThreadHistory({
        agentId: 'agent1',
        config: config as any,
        conversation: { _id: 'conv1' } as any,
        thread: { messages: asyncMessages([message]) } as any,
        message: message as any,
        platformThreadId: 'slack:C1:1.0',
        conversationService: { importInboundMessages },
        logger: { warn: sinon.stub() },
      });

      expect(importInboundMessages.called).to.equal(false);
    });
  });
});
