import 'server-only';

import type { User } from '@clerk/nextjs/server';

import { hostLiveness } from './host-status';
import type { HumanAccount } from './human-account';
import { getRelayAgent } from './human-agent-api';
import type { ChannelVia } from './human-channels-api';
import { loadChannelsOverview } from './human-channels-overview';
import { loadHostStatus } from './human-hosts-api';
import { describeAgentIdentity } from './human-onboarding';
import { readOnboardingState } from './onboarding-state';
import type { PublicAgentCard } from './public-agent-card';
import type { ShareImageCard } from './share-image';
import { readSiteOrigin } from './site-origin';

/**
 * The signed-in operator's agent as its share image draws it: the card of the Configure page, every line
 * on it. `null` while the account has no agent.
 */
export async function loadOwnShareImage(account: HumanAccount, user: User): Promise<ShareImageCard | null> {
  const agent = await getRelayAgent(account);
  if (!agent) {
    return null;
  }

  const [{ rows, telegramSetup, slackSetup }, hostStatus, origin] = await Promise.all([
    loadChannelsOverview(account),
    loadHostStatus(account),
    readSiteOrigin(),
  ]);

  // As the Configure page reads them for its card.
  const connected = (via: ChannelVia) => rows.some((row) => row.via === via && row.connected);
  const email = rows.find((row) => row.via === 'email' && row.connected)?.handles[0]?.value ?? null;
  const identity = describeAgentIdentity(agent, readOnboardingState(user), origin, email ?? undefined);
  const telegramBot = connected('telegram') && 'botUsername' in telegramSetup ? telegramSetup.botUsername : '';
  const slackNames =
    slackSetup.step === 'connected' ? [slackSetup.appName, slackSetup.workspace].filter(Boolean).join(' · ') : '';
  const hostConnected = hostLiveness(hostStatus?.lastCheckedAt ?? null, Date.now()) === 'live';

  return {
    name: identity.name,
    handle: identity.handle,
    address: email,
    cardLink: identity.cardLink,
    pictureUrl: identity.pictureUrl,
    createdAt: identity.createdAt,
    operatorName: agent.operatorName,
    operatorFirstName: agent.operatorFirstName,
    state: !agent.active || agent.settings?.paused ? 'paused' : hostConnected ? 'active' : 'waiting',
    telegram: connected('telegram') ? { bot: telegramBot ? `@${telegramBot}` : null } : null,
    host: { connected: hostConnected },
    slack: connected('slack') ? slackNames || 'Connected' : null,
  };
}

/** The public card as its share image draws it: only what the card itself shows. */
export function publicShareImage(card: PublicAgentCard): ShareImageCard {
  return {
    name: card.name,
    handle: card.handle,
    address: card.address,
    cardLink: card.cardLink,
    pictureUrl: card.pictureUrl ?? undefined,
    createdAt: card.issuedAt,
    operatorName: card.operatorName,
    operatorFirstName: card.operatorFirstName,
    state: card.status,
    telegram: card.telegramBot ? { bot: card.telegramBot } : null,
  };
}
