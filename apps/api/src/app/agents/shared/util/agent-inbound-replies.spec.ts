import { expect } from 'chai';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { buildUnresolvedSubscriberAccessReply, UNRESOLVED_SUBSCRIBER_ACCESS_REPLY } from './agent-inbound-replies';

describe('buildUnresolvedSubscriberAccessReply', () => {
  it('returns email-specific copy when platform is email and sender is known', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: 'unknown@example.com',
    });

    expect(reply).to.include('unknown@example.com');
    expect(reply).to.include('Novu account');
    expect(reply).to.not.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
  });

  it('returns generic copy when platform is email but sender is missing', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: '   ',
    });

    expect(reply).to.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
  });

  it('returns generic copy for non-email platforms', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.SLACK,
      senderEmail: 'user@example.com',
    });

    expect(reply).to.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
  });
});
