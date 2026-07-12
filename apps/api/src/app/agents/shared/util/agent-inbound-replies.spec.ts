import { expect } from 'chai';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import {
  buildUnresolvedSubscriberAccessReply,
  UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from './agent-inbound-replies';

describe('buildUnresolvedSubscriberAccessReply', () => {
  it('returns email-specific copy when platform is email and sender is known', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: 'unknown@example.com',
    });

    expect(reply).to.equal(
      "We couldn't match unknown@example.com to a known user. " +
        'Send from the address registered with your account, or sign up in the app that owns this agent using that same address.'
    );
    expect(reply).to.not.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
  });

  it('keeps email-specific copy for a genuine not_found outcome', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: 'unknown@example.com',
      resolutionOutcome: 'not_found',
    });

    expect(reply).to.include('unknown@example.com');
    expect(reply).to.not.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
  });

  it('returns transient copy when resolution errored — the sender address was never rejected', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: 'known@example.com',
      resolutionOutcome: 'error',
    });

    expect(reply).to.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
    expect(reply).to.not.include('known@example.com');
  });

  it('does not treat a resolved outcome as transient — the handler reclassifies unloadable records as error', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.EMAIL,
      senderEmail: 'known@example.com',
      resolutionOutcome: 'resolved',
    });

    expect(reply).to.not.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
  });

  it('returns generic access copy for invalid_identity', () => {
    const reply = buildUnresolvedSubscriberAccessReply({
      platform: AgentPlatformEnum.SLACK,
      resolutionOutcome: 'invalid_identity',
    });

    expect(reply).to.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
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

  it('uses agent-wide identity copy for the generic access reply', () => {
    expect(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY).to.equal(
      "We couldn't match your identity to a known user, so this agent can't reply yet. " +
        'Sign in or link your account in the app that owns this agent, then try again.'
    );
  });
});
