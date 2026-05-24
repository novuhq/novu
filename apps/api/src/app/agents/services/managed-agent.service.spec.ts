import { expect } from 'chai';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { buildAnonymousUserMcpMessage } from './managed-agent.service';

describe('buildAnonymousUserMcpMessage', () => {
  it('mentions the MCP server name and Slack when the platform is Slack', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.SLACK, 'Linear');

    expect(message).to.contain('**Linear**');
    expect(message).to.contain('Slack account');
    expect(message).to.contain('workspace admin');
  });

  it('mentions Teams when the platform is Teams', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.TEAMS, 'Linear');

    expect(message).to.contain('Teams account');
  });

  it('mentions WhatsApp when the platform is WhatsApp', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.WHATSAPP, 'Linear');

    expect(message).to.contain('WhatsApp account');
  });

  it('uses Telegram-specific self-serve wording for Telegram', () => {
    const message = buildAnonymousUserMcpMessage(AgentPlatformEnum.TELEGRAM, 'Linear');

    expect(message).to.contain('**Linear**');
    expect(message).to.contain('Telegram chat');
    expect(message).to.contain('connection link');
    expect(message).to.not.contain('workspace admin');
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
