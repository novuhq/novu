import { expect } from 'chai';
import type { Message } from 'chat';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  extractSlackMessageText,
  isSlackBotAuthoredMessage,
  resolveSlackThreadParentTs,
  SeedSlackThreadParentService,
} from './seed-slack-thread-parent.service';

function makeMessage(overrides: {
  id?: string;
  text?: string;
  thread_ts?: string;
  ts?: string;
}): Message {
  const ts = overrides.ts ?? overrides.id ?? '1777837477.000200';
  const event: Record<string, unknown> = { ts, text: overrides.text ?? 'reply' };

  if (overrides.thread_ts !== undefined) {
    event.thread_ts = overrides.thread_ts;
  }

  return {
    id: overrides.id ?? ts,
    text: overrides.text ?? 'reply',
    author: { userId: 'U123', isBot: false },
    raw: { event },
  } as Message;
}

describe('resolveSlackThreadParentTs', () => {
  it('returns null for top-level messages without thread_ts', () => {
    expect(resolveSlackThreadParentTs(makeMessage({ ts: '1.1' }))).to.equal(null);
  });

  it('returns null when thread_ts equals the message ts (message is the root)', () => {
    expect(resolveSlackThreadParentTs(makeMessage({ ts: '1.1', thread_ts: '1.1' }))).to.equal(null);
  });

  it('returns the parent ts for a thread reply', () => {
    expect(resolveSlackThreadParentTs(makeMessage({ ts: '1.2', thread_ts: '1.1' }))).to.equal('1.1');
  });
});

describe('isSlackBotAuthoredMessage', () => {
  it('detects bot_id, app_id, and bot_message subtype', () => {
    expect(isSlackBotAuthoredMessage({ bot_id: 'B1' })).to.equal(true);
    expect(isSlackBotAuthoredMessage({ app_id: 'A1' })).to.equal(true);
    expect(isSlackBotAuthoredMessage({ subtype: 'bot_message' })).to.equal(true);
    expect(isSlackBotAuthoredMessage({ text: 'from a human' })).to.equal(false);
  });
});

describe('extractSlackMessageText', () => {
  it('prefers the top-level text field', () => {
    expect(extractSlackMessageText({ text: 'hello', blocks: [{ type: 'section', text: { text: 'ignored' } }] })).to.equal(
      'hello'
    );
  });

  it('falls back to block kit section and field text', () => {
    expect(
      extractSlackMessageText({
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: 'insight' } },
          { type: 'section', fields: [{ type: 'mrkdwn', text: 'growth' }] },
        ],
      })
    ).to.equal('insight\ngrowth');
  });

  it('falls back to attachment fallback text', () => {
    expect(extractSlackMessageText({ attachments: [{ fallback: 'digest body' }] })).to.equal('digest body');
  });
});

describe('SeedSlackThreadParentService', () => {
  const config = {
    platform: AgentPlatformEnum.SLACK,
    connectionAccessToken: 'xoxb-token',
    environmentId: 'env1',
    organizationId: 'org1',
    agentIdentifier: 'revenue-agent',
    agentName: 'Revenue Agent',
    integrationId: 'integration1',
  } as any;

  const conversation = {
    _id: 'conversation1',
    channels: [{ platform: 'slack', _integrationId: 'integration1', platformThreadId: 'slack:C1:1.1' }],
  } as any;

  function makeService() {
    const conversationService = {
      findSourceActivity: sinon.stub().resolves(null),
      getPrimaryChannel: sinon.stub().callsFake((conv) => conv.channels[0]),
      persistAgentMessage: sinon.stub().resolves({ _id: 'activity-parent' }),
    };
    const logger = {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
    };
    const service = new SeedSlackThreadParentService(conversationService as any, logger as any);

    return { service, conversationService, logger };
  }

  it('persists a bot thread parent before the inbound reply is recorded', async () => {
    const { service, conversationService } = makeService();
    const replies = sinon.stub().resolves({
      ok: true,
      messages: [{ ts: '1.1', text: 'New revenue insight found', bot_id: 'B123' }],
    });
    service.createClient = (() => ({ conversations: { replies } })) as any;

    const parentTs = await service.maybeSeed({
      agentId: 'agent1',
      config,
      conversation,
      message: makeMessage({ ts: '1.2', thread_ts: '1.1', text: 'check latest deals' }),
      platformThreadId: 'slack:C1:1.1',
    });

    expect(parentTs).to.equal('1.1');
    expect(replies.calledOnce).to.equal(true);
    expect(replies.firstCall.args[0]).to.deep.include({
      channel: 'C1',
      ts: '1.1',
      latest: '1.1',
      inclusive: true,
      limit: 1,
    });
    expect(conversationService.persistAgentMessage.calledOnce).to.equal(true);
    expect(conversationService.persistAgentMessage.firstCall.args[0]).to.include({
      conversationId: 'conversation1',
      platformMessageId: '1.1',
      platformThreadId: 'slack:C1:1.1',
      agentIdentifier: 'revenue-agent',
      content: 'New revenue insight found',
    });
  });

  it('is idempotent when the parent activity already exists', async () => {
    const { service, conversationService } = makeService();
    conversationService.findSourceActivity.resolves({ platformMessageId: '1.1' });
    const replies = sinon.stub();
    service.createClient = (() => ({ conversations: { replies } })) as any;

    const parentTs = await service.maybeSeed({
      agentId: 'agent1',
      config,
      conversation,
      message: makeMessage({ ts: '1.2', thread_ts: '1.1' }),
      platformThreadId: 'slack:C1:1.1',
    });

    expect(parentTs).to.equal('1.1');
    expect(replies.called).to.equal(false);
    expect(conversationService.persistAgentMessage.called).to.equal(false);
  });

  it('does not seed human-authored thread parents as agent messages', async () => {
    const { service, conversationService } = makeService();
    service.createClient = (() => ({
      conversations: {
        replies: sinon.stub().resolves({
          ok: true,
          messages: [{ ts: '1.1', text: 'started by a teammate', user: 'U999' }],
        }),
      },
    })) as any;

    const parentTs = await service.maybeSeed({
      agentId: 'agent1',
      config,
      conversation,
      message: makeMessage({ ts: '1.2', thread_ts: '1.1' }),
      platformThreadId: 'slack:C1:1.1',
    });

    expect(parentTs).to.equal(null);
    expect(conversationService.persistAgentMessage.called).to.equal(false);
  });

  it('fails soft when Slack API errors', async () => {
    const { service, conversationService, logger } = makeService();
    service.createClient = (() => ({
      conversations: {
        replies: sinon.stub().rejects(new Error('slack down')),
      },
    })) as any;

    const parentTs = await service.maybeSeed({
      agentId: 'agent1',
      config,
      conversation,
      message: makeMessage({ ts: '1.2', thread_ts: '1.1' }),
      platformThreadId: 'slack:C1:1.1',
    });

    expect(parentTs).to.equal(null);
    expect(conversationService.persistAgentMessage.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('skips non-Slack platforms and top-level messages', async () => {
    const { service, conversationService } = makeService();

    expect(
      await service.maybeSeed({
        agentId: 'agent1',
        config: { ...config, platform: AgentPlatformEnum.TEAMS },
        conversation,
        message: makeMessage({ ts: '1.2', thread_ts: '1.1' }),
        platformThreadId: 'slack:C1:1.1',
      })
    ).to.equal(null);

    expect(
      await service.maybeSeed({
        agentId: 'agent1',
        config,
        conversation,
        message: makeMessage({ ts: '1.1' }),
        platformThreadId: 'slack:C1:1.1',
      })
    ).to.equal(null);

    expect(conversationService.findSourceActivity.called).to.equal(false);
  });
});
