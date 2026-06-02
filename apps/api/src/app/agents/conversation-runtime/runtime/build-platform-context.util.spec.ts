import type { AgentPlatformContext } from '@novu/framework';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { buildAgentPlatformContext, buildEmailPlatformContext } from './build-platform-context.util';

describe('buildAgentPlatformContext', () => {
  it('exposes the chat SDK raw payload on platformContext.message', () => {
    const raw = { messageId: 'msg-1@example.com', subject: 'Hello' };

    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      message: { raw } as never,
    });

    expect(context.message).to.deep.equal(raw);
  });

  it('attaches the email context when one is provided', () => {
    const email: AgentPlatformContext['email'] = {
      domain: { id: 'domain-1', name: 'inbox.example.com' },
      route: { address: 'support' },
      rootMessageId: 'root@example.com',
    };

    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      message: null,
      email,
    });

    expect(context.email).to.deep.equal(email);
  });

  it('omits message and email when neither is provided', () => {
    const context: AgentPlatformContext = buildAgentPlatformContext({
      platformThreadId: 'slack:C123:123.456',
      channelId: 'slack:C123',
      isDM: false,
      message: null,
    });

    expect(context.message).to.be.undefined;
    expect(context.email).to.be.undefined;
  });
});

describe('buildEmailPlatformContext', () => {
  it('returns undefined for non-email platforms', () => {
    const result = buildEmailPlatformContext({
      platform: AgentPlatformEnum.SLACK,
      message: { raw: { domain: { id: 'd', name: 'n' } } } as never,
      firstPlatformMessageId: 'root',
    });

    expect(result).to.be.undefined;
  });

  it('extracts domain, route, and root message id for email', () => {
    const raw = {
      messageId: 'reply3@example.com',
      domain: { id: 'domain-1', name: 'inbox.example.com', data: { tier: 'pro' } },
      route: { address: 'support', data: { queue: 'tier-1' } },
    };

    const result = buildEmailPlatformContext({
      platform: AgentPlatformEnum.EMAIL,
      message: { raw } as never,
      firstPlatformMessageId: 'root@example.com',
    });

    expect(result).to.deep.equal({
      domain: raw.domain,
      route: raw.route,
      rootMessageId: 'root@example.com',
    });
  });

  it('returns only the root message id during onResolve when there is no inbound message', () => {
    const result = buildEmailPlatformContext({
      platform: AgentPlatformEnum.EMAIL,
      message: null,
      firstPlatformMessageId: 'root@example.com',
    });

    expect(result).to.deep.equal({
      domain: undefined,
      route: undefined,
      rootMessageId: 'root@example.com',
    });
  });

  it('returns undefined when an email turn carries no resolved data at all', () => {
    const result = buildEmailPlatformContext({
      platform: AgentPlatformEnum.EMAIL,
      message: null,
    });

    expect(result).to.be.undefined;
  });
});
