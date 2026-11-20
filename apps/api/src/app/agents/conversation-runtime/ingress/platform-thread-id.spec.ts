import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { getInboundPlatformThreadId, isNestedSharedThread } from './platform-thread-id';

describe('getInboundPlatformThreadId', () => {
  it('appends the Slack DM message ts when the SDK thread id is empty', () => {
    expect(
      getInboundPlatformThreadId(
        AgentPlatformEnum.SLACK,
        { id: 'slack:D123:', channelId: 'slack:D123', isDM: true } as any,
        { id: '1777837477.371619', raw: { thread_ts: '1777837477.371619' } } as any
      )
    ).to.equal('slack:D123:1777837477.371619');
  });

  it('remaps a Slack channel-root mention onto the spawned thread id', () => {
    expect(
      getInboundPlatformThreadId(
        AgentPlatformEnum.SLACK,
        { id: 'slack:C1:', channelId: 'slack:C1', isDM: false } as any,
        { id: 'mention-ts', isMention: true } as any
      )
    ).to.equal('slack:C1:mention-ts');
  });

  it('keeps an already-nested Slack thread id', () => {
    expect(
      getInboundPlatformThreadId(
        AgentPlatformEnum.SLACK,
        { id: 'slack:C1:root-ts', channelId: 'slack:C1', isDM: false } as any,
        { id: 'follow-up', raw: { thread_ts: 'root-ts' } } as any
      )
    ).to.equal('slack:C1:root-ts');
  });

  it('does not remap Telegram group chats', () => {
    expect(
      getInboundPlatformThreadId(
        AgentPlatformEnum.TELEGRAM,
        { id: 'telegram:-100123', channelId: '-100123', isDM: false } as any,
        { id: 'msg-1' } as any
      )
    ).to.equal('telegram:-100123');
  });
});

describe('isNestedSharedThread', () => {
  it('is false for DMs', () => {
    expect(
      isNestedSharedThread(AgentPlatformEnum.SLACK, { isDM: true, channelId: 'slack:D123' } as any, 'slack:D123:1.0')
    ).to.equal(false);
  });

  it('is false for Slack channel-root', () => {
    expect(
      isNestedSharedThread(AgentPlatformEnum.SLACK, { isDM: false, channelId: 'slack:C1' } as any, 'slack:C1:')
    ).to.equal(false);
  });

  it('is true for a Slack thread under the channel', () => {
    expect(
      isNestedSharedThread(AgentPlatformEnum.SLACK, { isDM: false, channelId: 'slack:C1' } as any, 'slack:C1:root-ts')
    ).to.equal(true);
  });

  it('is false for Telegram groups', () => {
    expect(
      isNestedSharedThread(AgentPlatformEnum.TELEGRAM, { isDM: false, channelId: '-100123' } as any, 'telegram:-100123')
    ).to.equal(false);
  });
});
