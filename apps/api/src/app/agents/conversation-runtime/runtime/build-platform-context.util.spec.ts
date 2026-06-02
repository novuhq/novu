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

  it('extracts resolved domain, route, and thread root for email platform', () => {
    const raw = {
      id: 'reply3@example.com',
      messageId: 'reply3@example.com',
      domain: { id: 'domain-1', name: 'inbox.example.com', data: { tier: 'pro' } },
      route: { address: 'support', data: { queue: 'tier-1' } },
    };

    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: { raw, id: 'reply3@example.com' } as never,
      firstPlatformMessageId: 'root@example.com',
    });

    expect(context.email).to.deep.equal({
      domain: raw.domain,
      route: raw.route,
      rootMessageId: 'root@example.com',
    });
  });

  it('falls back to the current message id as the email root when no first message id is tracked', () => {
    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: 'email:dima@novu.co',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: { raw: { messageId: 'root@example.com' }, id: 'root@example.com' } as never,
    });

    expect(context.email).to.deep.equal({
      domain: undefined,
      route: undefined,
      rootMessageId: 'root@example.com',
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
      message: { raw, id: '123.456' } as never,
      firstPlatformMessageId: '123.456',
    });

    expect(context.message).to.deep.equal(raw);
    expect(context.email).to.be.undefined;
  });

  it('omits message and email when there is no chat message or tracked root', () => {
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

  it('sets email root from the tracked first message id during onResolve (no inbound message)', () => {
    const context = buildAgentPlatformContext({
      platformThreadId: 'email:dima@novu.co:abc',
      channelId: '',
      isDM: false,
      platform: AgentPlatformEnum.EMAIL,
      message: null,
      firstPlatformMessageId: 'root@example.com',
    });

    expect(context.email).to.deep.equal({
      domain: undefined,
      route: undefined,
      rootMessageId: 'root@example.com',
    });
  });
});
