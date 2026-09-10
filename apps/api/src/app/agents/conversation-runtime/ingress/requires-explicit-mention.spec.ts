import { ConversationParticipantTypeEnum } from '@novu/dal';
import { AgentReplyPolicyEnum } from '@novu/shared';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { countHumanParticipants, detectSmartThreadJoin, requiresExplicitMention } from './requires-explicit-mention';

const nestedThread = { isDM: false, channelId: 'slack:C1' } as any;
const nestedId = 'slack:C1:root-ts';
const follow = {
  replyPolicy: AgentReplyPolicyEnum.AUTO_REPLY,
  platform: AgentPlatformEnum.SLACK,
  conversationExists: true,
  platformThreadId: nestedId,
  humanParticipantCount: 1,
};

describe('requiresExplicitMention', () => {
  it('lets DMs through without a mention', () => {
    expect(requiresExplicitMention({ isDM: true } as any, { isMention: false } as any, follow)).to.equal(false);
    expect(requiresExplicitMention({ isDM: true } as any, {} as any, follow)).to.equal(false);
  });

  it('lets an explicit mention through in a shared room', () => {
    expect(requiresExplicitMention({ isDM: false } as any, { isMention: true } as any, follow)).to.equal(false);
  });

  it('requires a mention for unmentioned channel-root messages', () => {
    const channelRoot = {
      ...follow,
      conversationExists: true,
      platformThreadId: 'slack:C1:',
    };

    expect(
      requiresExplicitMention({ isDM: false, channelId: 'slack:C1' } as any, { isMention: false } as any, channelRoot)
    ).to.equal(true);
  });

  it('requires a mention in nested threads when replyPolicy is mention_only', () => {
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, {
        ...follow,
        replyPolicy: AgentReplyPolicyEnum.MENTION_ONLY,
      })
    ).to.equal(true);
  });

  it('requires a mention in nested threads the agent has not joined', () => {
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, {
        ...follow,
        conversationExists: false,
      })
    ).to.equal(true);
  });

  it('lets unmentioned nested-thread follow-ups through after the agent has joined', () => {
    expect(requiresExplicitMention(nestedThread, { isMention: false } as any, follow)).to.equal(false);
    expect(requiresExplicitMention(nestedThread, {} as any, follow)).to.equal(false);
  });

  it('keeps auto_reply following a nested thread however many people are in it', () => {
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, { ...follow, humanParticipantCount: 4 })
    ).to.equal(false);
  });

  it('lets smart follow a nested thread while the agent is one-on-one', () => {
    const smart = { ...follow, replyPolicy: AgentReplyPolicyEnum.SMART };

    expect(requiresExplicitMention(nestedThread, { isMention: false } as any, smart)).to.equal(false);
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, { ...smart, humanParticipantCount: 0 })
    ).to.equal(false);
  });

  it('makes smart require a mention once a second person has spoken', () => {
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, {
        ...follow,
        replyPolicy: AgentReplyPolicyEnum.SMART,
        humanParticipantCount: 2,
      })
    ).to.equal(true);
  });

  it('still requires a mention for Telegram groups even after a conversation exists', () => {
    expect(
      requiresExplicitMention({ isDM: false, channelId: '-100123' } as any, { isMention: false } as any, {
        replyPolicy: AgentReplyPolicyEnum.AUTO_REPLY,
        platform: AgentPlatformEnum.TELEGRAM,
        conversationExists: true,
        platformThreadId: 'telegram:-100123',
        humanParticipantCount: 1,
      })
    ).to.equal(true);
  });
});

describe('countHumanParticipants', () => {
  it('treats a missing conversation as nobody having spoken', () => {
    expect(countHumanParticipants(null)).to.equal(0);
    expect(countHumanParticipants(undefined)).to.equal(0);
  });

  it('excludes the agent from the count', () => {
    const conversation = {
      participants: [
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub1' },
        { type: ConversationParticipantTypeEnum.AGENT, id: 'agent1' },
      ],
    } as any;

    expect(countHumanParticipants(conversation)).to.equal(1);
  });

  it('counts subscribers and unlinked platform users alike', () => {
    const conversation = {
      participants: [
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub1' },
        { type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'slack:U2' },
        { type: ConversationParticipantTypeEnum.AGENT, id: 'agent1' },
      ],
    } as any;

    expect(countHumanParticipants(conversation)).to.equal(2);
  });
});

describe('detectSmartThreadJoin', () => {
  const agent = { type: ConversationParticipantTypeEnum.AGENT, id: 'agent1' };
  const incumbent = { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub1' };
  const base = {
    replyPolicy: AgentReplyPolicyEnum.SMART,
    participantsSnapshot: [incumbent, agent],
    subscriberId: 'sub2',
    platform: AgentPlatformEnum.SLACK,
    platformUserId: 'U2',
  };

  it('fires when a different human speaks in a one-on-one thread', () => {
    expect(detectSmartThreadJoin(base)).to.equal(true);
  });

  it('stays quiet for the incumbent', () => {
    expect(detectSmartThreadJoin({ ...base, subscriberId: 'sub1' })).to.equal(false);
  });

  it('recognises the incumbent by their raw platform identity when they are not linked', () => {
    expect(
      detectSmartThreadJoin({
        ...base,
        participantsSnapshot: [{ type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'slack:U2' }, agent],
        subscriberId: null,
      })
    ).to.equal(false);
  });

  it('does not mistake a newly linked incumbent for a stranger', () => {
    expect(
      detectSmartThreadJoin({
        ...base,
        participantsSnapshot: [{ type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'slack:U2' }, agent],
        subscriberId: 'sub2',
      })
    ).to.equal(false);
  });

  it('stays quiet once the thread is already shared', () => {
    expect(
      detectSmartThreadJoin({
        ...base,
        participantsSnapshot: [incumbent, { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub3' }, agent],
      })
    ).to.equal(false);
  });

  it('stays quiet on a thread nobody has spoken in yet', () => {
    expect(detectSmartThreadJoin({ ...base, participantsSnapshot: [agent] })).to.equal(false);
  });

  it('never fires for the other reply policies', () => {
    expect(detectSmartThreadJoin({ ...base, replyPolicy: AgentReplyPolicyEnum.AUTO_REPLY })).to.equal(false);
    expect(detectSmartThreadJoin({ ...base, replyPolicy: AgentReplyPolicyEnum.MENTION_ONLY })).to.equal(false);
  });
});
