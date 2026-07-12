import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { shouldAutoProvisionInbound } from './platform-endpoint-config';

describe('shouldAutoProvisionInbound', () => {
  const platforms = [
    AgentPlatformEnum.SLACK,
    AgentPlatformEnum.TEAMS,
    AgentPlatformEnum.TELEGRAM,
    AgentPlatformEnum.WHATSAPP,
    AgentPlatformEnum.EMAIL,
  ];

  it('returns false for every platform when subscriberAccess is restricted', () => {
    for (const platform of platforms) {
      expect(
        shouldAutoProvisionInbound({
          platform,
          subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
          telegramChatId: '42',
          platformUserId: '42',
        }),
        `${platform} should not auto-provision when restricted`
      ).to.equal(false);
    }
  });

  it('returns true for Slack, Teams, and WhatsApp when subscriberAccess is open', () => {
    for (const platform of [AgentPlatformEnum.SLACK, AgentPlatformEnum.TEAMS, AgentPlatformEnum.WHATSAPP]) {
      expect(
        shouldAutoProvisionInbound({
          platform,
          subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        }),
        `${platform} should auto-provision when open`
      ).to.equal(true);
    }
  });

  it('returns true for open email when not keyless, and false when keyless', () => {
    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.EMAIL,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isKeyless: false,
      })
    ).to.equal(true);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.EMAIL,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isKeyless: true,
      })
    ).to.equal(false);
  });

  it('returns true for open Telegram only when chatId equals platformUserId (DM)', () => {
    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        telegramChatId: '42',
        platformUserId: '42',
      })
    ).to.equal(true);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        telegramChatId: '-100123',
        platformUserId: '42',
      })
    ).to.equal(false);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      })
    ).to.equal(false);
  });
});
