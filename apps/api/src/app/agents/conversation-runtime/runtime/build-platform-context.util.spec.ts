import type { AgentPlatformContext } from '@novu/framework';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { buildAgentPlatformContext } from './build-platform-context.util';

describe('buildAgentPlatformContext', () => {
  it('includes chat SDK raw message on platformContext.message', () => {
    const raw = { messageId: 'msg-1@example.com', subject: 'Hello' };

    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: { raw } as never,
    });

    expect(context.message).to.deep.equal(raw);
  });

  it('extracts resolved domain and route for email platform', () => {
    const raw = {
      messageId: 'msg-1@example.com',
      domain: { id: 'domain-1', name: 'inbox.example.com', data: { tier: 'pro' } },
      route: { address: 'support', data: { queue: 'tier-1' } },
    };

    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: { raw } as never,
    });

    expect(context.email).to.deep.equal({
      domain: raw.domain,
      route: raw.route,
    });
  });

  it('does not set email metadata for non-email platforms', () => {
    const raw = {
      domain: { id: 'domain-1', name: 'inbox.example.com' },
      route: { address: 'support' },
    };

    const context = buildAgentPlatformContext({
      platformThreadId: 'slack:C123:123.456',
      channelId: 'slack:C123',
      isDM: false,
      platform: AgentPlatformEnum.SLACK,
      message: { raw } as never,
    });

    expect(context.message).to.deep.equal(raw);
    expect(context.email).to.be.undefined;
  });

  it('omits message and email when no chat message is provided', () => {
    const context: AgentPlatformContext = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: null,
    });

    expect(context.message).to.be.undefined;
    expect(context.email).to.be.undefined;
  });
});
