import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from '@novu/dal';
import { MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { ManagedAgentService } from './managed-agent.service';
import { buildAnonymousUserMcpMessage } from './managed-agent-event-handler';

function makeLogger() {
  return {
    setContext: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
  };
}

describe('ManagedAgentService buildMessagesWithHistory', () => {
  it('returns persisted activities only and does not duplicate the inbound message', async () => {
    const findByConversation = sinon.stub().resolves([
      {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        content: 'Hello',
        createdAt: '2026-05-26T12:00:00.000Z',
      },
    ]);
    const service = new ManagedAgentService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { findByConversation } as never,
      {} as never,
      {} as never,
      {} as never,
      makeLogger() as never
    );
    const context = {
      config: { environmentId: 'env_1' },
      conversation: { _id: 'conv_1' },
      message: { text: 'Hello' },
    };

    const messages = await (
      service as unknown as {
        buildMessagesWithHistory(ctx: typeof context): Promise<{ role: MessageRole; content: string }[]>;
      }
    ).buildMessagesWithHistory(context);

    expect(messages).to.deep.equal([{ role: MessageRole.USER, content: 'Hello' }]);
    expect(findByConversation.calledOnceWith('env_1', 'conv_1', 50)).to.equal(true);
  });
});

describe('buildAnonymousUserMcpMessage', () => {
  it('mentions the MCP server name and Slack when the platform is Slack', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.SLACK, 'Linear');

    expect(message).to.contain('**Linear**');
    expect(message).to.contain('Slack account');
    expect(message).to.contain("isn't linked to a Novu subscriber");
  });

  it('mentions Teams when the platform is Teams', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.TEAMS, 'Linear');

    expect(message).to.contain('Teams account');
  });

  it('mentions WhatsApp when the platform is WhatsApp', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.WHATSAPP, 'Linear');

    expect(message).to.contain('WhatsApp account');
  });

  it('mentions Telegram when the platform is Telegram', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.TELEGRAM, 'Linear');

    expect(message).to.contain('**Linear**');
    expect(message).to.contain('Telegram account');
    expect(message).to.contain("isn't linked to a Novu subscriber");
  });

  it('mentions Email when the platform is Email', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.EMAIL, 'Linear');

    expect(message).to.contain('email account');
  });

  it('falls back to a generic "chat account" label when platform is undefined', () => {
    const message = buildAnonymousUserMcpMessage(undefined, 'Linear');

    expect(message).to.contain('**Linear**');
    expect(message).to.contain('chat account');
  });

  it('does NOT use the legacy "temporarily unavailable" wording', () => {
    const platforms = [
      AgentPlatformEnum.SLACK,
      AgentPlatformEnum.TEAMS,
      AgentPlatformEnum.WHATSAPP,
      AgentPlatformEnum.EMAIL,
      AgentPlatformEnum.TELEGRAM,
      undefined,
    ];

    for (const platform of platforms) {
      const message = buildAnonymousUserMcpMessage(platform, 'Linear');
      expect(message, `platform=${platform ?? 'undefined'}`).to.not.contain('temporarily unavailable');
    }
  });
});
