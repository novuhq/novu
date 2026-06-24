import { ChatProviderIdEnum } from '@novu/shared';
import { buildMsTeamsWhatsNextConfig } from './msteams-whats-next-config';
import { buildSlackWhatsNextConfig } from './slack-whats-next-config';
import type { ChannelWhatsNextConfig, ChannelWhatsNextConfigBuilder, WhatsNextConfigContext } from './whats-next-types';

/**
 * Per-provider "what's next" guidance builders. Add a new entry to surface the developer-guidance
 * card on a provider's connected channel-detail page; the shell stays untouched.
 */
const WHATS_NEXT_CONFIG_BUILDERS: Partial<Record<string, ChannelWhatsNextConfigBuilder>> = {
  [ChatProviderIdEnum.Slack]: buildSlackWhatsNextConfig,
  [ChatProviderIdEnum.MsTeams]: buildMsTeamsWhatsNextConfig,
};

export function resolveChannelWhatsNextConfig(ctx: WhatsNextConfigContext): ChannelWhatsNextConfig | null {
  const builder = WHATS_NEXT_CONFIG_BUILDERS[ctx.integrationLink.integration.providerId];

  return builder ? builder(ctx) : null;
}

/**
 * Whether a provider has implemented the "what's next" user-rollout phase (the guided flow that
 * helps a developer make the connected agent reachable by their own users). Only these providers
 * should surface the rollout-specific "Continue" step after an in-session connect; everyone else
 * falls back to a generic continue note.
 */
export function providerHasWhatsNextPhase(providerId: string): boolean {
  return Boolean(WHATS_NEXT_CONFIG_BUILDERS[providerId]);
}
