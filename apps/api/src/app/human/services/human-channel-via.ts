import { ChatProviderIdEnum, EmailProviderIdEnum, HumanChannelViaEnum } from '@novu/shared';

/** The providers behind each channel a relay agent reaches people on. */
export const VIA_PROVIDER_IDS: Record<HumanChannelViaEnum, readonly string[]> = {
  [HumanChannelViaEnum.TELEGRAM]: [ChatProviderIdEnum.Telegram],
  [HumanChannelViaEnum.SLACK]: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu],
  [HumanChannelViaEnum.EMAIL]: [EmailProviderIdEnum.AgentEmailInbox],
};

/** The channel an integration is, by its provider, or null for a provider that is none of them. */
export function viaForProviderId(providerId: string): HumanChannelViaEnum | null {
  for (const [via, providerIds] of Object.entries(VIA_PROVIDER_IDS) as Array<
    [HumanChannelViaEnum, readonly string[]]
  >) {
    if (providerIds.includes(providerId)) {
      return via;
    }
  }

  return null;
}
