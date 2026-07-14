import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { isOpenAccessIdentityPlatform, shouldAutoProvisionInbound } from './platform-endpoint-config';

describe('shouldAutoProvisionInbound', () => {
  const platforms = [
    AgentPlatformEnum.SLACK,
    AgentPlatformEnum.TEAMS,
    AgentPlatformEnum.TELEGRAM,
    AgentPlatformEnum.WHATSAPP,
    AgentPlatformEnum.EMAIL,
    AgentPlatformEnum.SENDBLUE,
  ];

  it('returns false for every platform when subscriberAccess is restricted', () => {
    for (const platform of platforms) {
      expect(
        shouldAutoProvisionInbound({
          platform,
          subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
          isManaged: true,
          telegramChatId: '42',
          platformUserId: '42',
        }),
        `${platform} should not auto-provision when restricted`
      ).to.equal(false);
    }
  });

  it('returns false for every platform when the agent is not managed', () => {
    for (const platform of platforms) {
      expect(
        shouldAutoProvisionInbound({
          platform,
          subscriberAccess: AgentSubscriberAccessEnum.OPEN,
          isManaged: false,
          telegramChatId: '42',
          platformUserId: '42',
        }),
        `${platform} should not auto-provision for custom-code`
      ).to.equal(false);
    }
  });

  it('returns true for Slack, Teams, WhatsApp, and Sendblue when managed + open', () => {
    for (const platform of [
      AgentPlatformEnum.SLACK,
      AgentPlatformEnum.TEAMS,
      AgentPlatformEnum.WHATSAPP,
      AgentPlatformEnum.SENDBLUE,
    ]) {
      expect(
        shouldAutoProvisionInbound({
          platform,
          subscriberAccess: AgentSubscriberAccessEnum.OPEN,
          isManaged: true,
        }),
        `${platform} should auto-provision when managed + open`
      ).to.equal(true);
    }
  });

  it('returns true for open email when not keyless, and false when keyless', () => {
    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.EMAIL,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isManaged: true,
        isKeyless: false,
      })
    ).to.equal(true);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.EMAIL,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isManaged: true,
        isKeyless: true,
      })
    ).to.equal(false);
  });

  it('returns true for open Telegram only when chatId equals platformUserId (DM)', () => {
    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isManaged: true,
        telegramChatId: '42',
        platformUserId: '42',
      })
    ).to.equal(true);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isManaged: true,
        telegramChatId: '-100123',
        platformUserId: '42',
      })
    ).to.equal(false);

    expect(
      shouldAutoProvisionInbound({
        platform: AgentPlatformEnum.TELEGRAM,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
        isManaged: true,
      })
    ).to.equal(false);
  });
});

describe('isOpenAccessIdentityPlatform', () => {
  it('includes email, WhatsApp, and Sendblue', () => {
    expect(isOpenAccessIdentityPlatform(AgentPlatformEnum.EMAIL)).to.equal(true);
    expect(isOpenAccessIdentityPlatform(AgentPlatformEnum.WHATSAPP)).to.equal(true);
    expect(isOpenAccessIdentityPlatform(AgentPlatformEnum.SENDBLUE)).to.equal(true);
    expect(isOpenAccessIdentityPlatform(AgentPlatformEnum.SLACK)).to.equal(false);
  });
});
