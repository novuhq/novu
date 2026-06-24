import { ChatProviderIdEnum } from '@novu/shared';
import { buildSlackWhatsNextConfig } from './slack-whats-next-config';
import type { ChannelWhatsNextConfig, ChannelWhatsNextConfigBuilder, WhatsNextConfigContext } from './whats-next-types';

/**
 * Per-provider "what's next" guidance builders. Add a new entry to surface the developer-guidance
 * card on a provider's connected channel-detail page; the shell stays untouched.
 */
const WHATS_NEXT_CONFIG_BUILDERS: Partial<Record<string, ChannelWhatsNextConfigBuilder>> = {
  [ChatProviderIdEnum.Slack]: buildSlackWhatsNextConfig,
};

export function resolveChannelWhatsNextConfig(ctx: WhatsNextConfigContext): ChannelWhatsNextConfig | null {
  const builder = WHATS_NEXT_CONFIG_BUILDERS[ctx.integrationLink.integration.providerId];

  return builder ? builder(ctx) : null;
}
