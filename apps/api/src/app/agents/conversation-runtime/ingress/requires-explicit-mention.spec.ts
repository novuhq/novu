import { ConversationParticipantTypeEnum } from '@novu/dal';
import { AgentReplyPolicyEnum } from '@novu/shared';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  countHumanParticipants,
  detectSmartExclusiveThreadEnded,
  followsNestedThreadWithoutMention,
  messageMentionsOtherHuman,
  requiresExplicitMention,
} from './requires-explicit-mention';

const nestedThread = { isDM: false, channelId: 'slack:C1' } as any;
const nestedId = 'slack:C1:root-ts';
const follow = {
  replyPolicy: AgentReplyPolicyEnum.AUTO_REPLY,
  platform: AgentPlatformEnum.SLACK,
  conversationExists: true,
  platformThreadId: nestedId,
  humanParticipantCount: 1,
};
const noMentionMessage = { isMention: false, text: 'the deploy is still failing', author: { userId: 'U2' } } as any;

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

  it('makes smart require a mention after a teammate was @mentioned in a one-on-one thread', () => {
    expect(
      requiresExplicitMention(nestedThread, { isMention: false } as any, {
        ...follow,
        replyPolicy: AgentReplyPolicyEnum.SMART,
        humanParticipantCount: 1,
        smartMentionRequired: true,
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

describe('followsNestedThreadWithoutMention', () => {
  it('stops smart auto-follow when the mention-required flag is set', () => {
    expect(
      followsNestedThreadWithoutMention({
        ...follow,
        replyPolicy: AgentReplyPolicyEnum.SMART,
        smartMentionRequired: true,
      })
    ).to.equal(false);
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

describe('messageMentionsOtherHuman', () => {
  it('ignores Slack messages with no user mentions', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: 'the deploy is still failing', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(false);
  });

  it('ignores a Slack self-mention', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: 'cc <@U1>', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(false);
  });

  it('ignores a Slack bot-only mention', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: true, text: '<@UBOT> help', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(false);
  });

  it('ignores a Slack bot-only mention even when the SDK mention flag is missing', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: '<@UBOT> help', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(false);
  });

  it('detects a Slack teammate mention', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: 'hey <@U99> take a look', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(true);
  });

  it('detects Enterprise Grid and labeled Slack user mentions', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: 'cc <@W123ABC|alex>', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(true);
  });

  it('prefers structured Slack user elements over display text', () => {
    expect(
      messageMentionsOtherHuman(
        {
          isMention: false,
          text: 'Alex',
          author: { userId: 'U1' },
          raw: {
            event: {
              blocks: [
                {
                  type: 'rich_text',
                  elements: [
                    {
                      type: 'rich_text_section',
                      elements: [{ type: 'user', user_id: 'U99' }],
                    },
                  ],
                },
              ],
            },
          },
        } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(true);
  });

  it('detects a Slack teammate mention alongside the bot', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: true, text: '<@UBOT> cc <@U99>', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(true);
  });

  it('reads Slack mentions from the raw event text', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, author: { userId: 'U1' }, raw: { event: { text: 'ping <@U99>' } } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(true);
  });

  it('ignores Slack @here and user-group mentions', () => {
    expect(
      messageMentionsOtherHuman(
        { isMention: false, text: '<!here> <!subteam^S123|@eng>', author: { userId: 'U1' } } as any,
        AgentPlatformEnum.SLACK,
        'UBOT'
      )
    ).to.equal(false);
  });

  it('ignores a Teams bot-only mention', () => {
    expect(
      messageMentionsOtherHuman(
        {
          isMention: true,
          author: { userId: '29:alice' },
          raw: { entities: [{ type: 'mention', mentioned: { id: '28:bot' } }] },
        } as any,
        AgentPlatformEnum.TEAMS,
        'bot'
      )
    ).to.equal(false);
  });

  it('detects a Teams teammate mention', () => {
    expect(
      messageMentionsOtherHuman(
        {
          isMention: false,
          author: { userId: '29:alice' },
          raw: { entities: [{ type: 'mention', mentioned: { id: '29:bob', name: 'Bob' } }] },
        } as any,
        AgentPlatformEnum.TEAMS,
        'bot'
      )
    ).to.equal(true);
  });
});

describe('detectSmartExclusiveThreadEnded', () => {
  const agent = { type: ConversationParticipantTypeEnum.AGENT, id: 'agent1' };
  const incumbent = { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub1' };
  const base = {
    replyPolicy: AgentReplyPolicyEnum.SMART,
    participantsSnapshot: [incumbent, agent],
    subscriberId: 'sub2',
    platform: AgentPlatformEnum.SLACK,
    platformUserId: 'U2',
    botUserId: 'UBOT',
    message: noMentionMessage,
  };

  it('fires when a different human speaks in a one-on-one thread', () => {
    expect(detectSmartExclusiveThreadEnded(base)).to.equal('join');
  });

  it('stays quiet for the incumbent', () => {
    expect(detectSmartExclusiveThreadEnded({ ...base, subscriberId: 'sub1' })).to.equal(null);
  });

  it('fires when the incumbent mentions a teammate', () => {
    expect(
      detectSmartExclusiveThreadEnded({
        ...base,
        subscriberId: 'sub1',
        platformUserId: 'U1',
        message: { isMention: false, text: 'hey <@U99> take a look', author: { userId: 'U1' } } as any,
      })
    ).to.equal('teammate_mention');
  });

  it('prefers join when a newcomer also mentions a teammate', () => {
    expect(
      detectSmartExclusiveThreadEnded({
        ...base,
        message: { isMention: false, text: 'hey <@U99>', author: { userId: 'U2' } } as any,
      })
    ).to.equal('join');
  });

  it('recognises the incumbent by their raw platform identity when they are not linked', () => {
    expect(
      detectSmartExclusiveThreadEnded({
        ...base,
        participantsSnapshot: [{ type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'slack:U2' }, agent],
        subscriberId: null,
      })
    ).to.equal(null);
  });

  it('does not mistake a newly linked incumbent for a stranger', () => {
    expect(
      detectSmartExclusiveThreadEnded({
        ...base,
        participantsSnapshot: [{ type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'slack:U2' }, agent],
        subscriberId: 'sub2',
      })
    ).to.equal(null);
  });

  it('stays quiet once the thread is already shared', () => {
    expect(
      detectSmartExclusiveThreadEnded({
        ...base,
        participantsSnapshot: [incumbent, { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub3' }, agent],
      })
    ).to.equal(null);
  });

  it('stays quiet on a thread nobody has spoken in yet', () => {
    expect(detectSmartExclusiveThreadEnded({ ...base, participantsSnapshot: [agent] })).to.equal(null);
  });

  it('never fires for the other reply policies', () => {
    expect(detectSmartExclusiveThreadEnded({ ...base, replyPolicy: AgentReplyPolicyEnum.AUTO_REPLY })).to.equal(null);
    expect(detectSmartExclusiveThreadEnded({ ...base, replyPolicy: AgentReplyPolicyEnum.MENTION_ONLY })).to.equal(null);
  });
});
