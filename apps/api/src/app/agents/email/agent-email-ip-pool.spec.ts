import { EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { resolveAgentEmailIpPoolName } from './agent-email-ip-pool';

describe('resolveAgentEmailIpPoolName', () => {
  it('uses the dedicated pool for Agent Inbox mail', () => {
    expect(resolveAgentEmailIpPoolName(EmailProviderIdEnum.AgentEmailInbox)).to.equal('Agentinbox');
  });

  it('keeps regular agent mail on the Demo pool', () => {
    expect(resolveAgentEmailIpPoolName(EmailProviderIdEnum.NovuAgent)).to.equal('Demo');
  });
});
