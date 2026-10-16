import 'server-only';

import { cache } from 'react';

import { addressOf, cardLinkOf, HANDLE_MAX_LENGTH } from './onboarding';
import { readSiteOrigin } from './site-origin';

/** How the public card's chip shows the agent: working, or paused by its operator. */
export type PublicAgentStatus = 'active' | 'paused';

/**
 * Everything the public card at `agentinbox.md/p/{handle}` shows, and nothing else: this is all of the
 * agent that reaches a stranger's browser, and all its share image draws.
 */
export type PublicAgentCard = {
  name: string;
  handle: string;
  /** The picture the operator gave the agent. Without one the card shows the mascot. */
  pictureUrl: string | null;
  status: PublicAgentStatus;
  /** The operator's full name: "Run by Dima Grossman". */
  operatorName: string;
  /** When the agent was made, as an ISO timestamp: "issued Oct 3". */
  issuedAt: string;
  /** Its email address, which the card's code to scan and "Message atlas" start an email to. */
  address: string;
  /** Its Telegram bot's `@username`. `null` without Telegram: the card then leaves that line out. */
  telegramBot: string | null;
  /** The card's own link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). */
  cardLink: string;
};

/** The card, or that there is none to show at this link. Which of the reasons it was is never told. */
export type PublicAgentCardResult = { available: true; card: PublicAgentCard } | { available: false };

const NOT_AVAILABLE: PublicAgentCardResult = { available: false };

/** What a handle can be: lowercase letters and digits, with single hyphens in between (see `toHandle`). */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * What every card shows until NV-9032 lets the API find an agent by its handle: the design's sample card,
 * under the handle of the link, with the same sample Telegram bot on every card.
 */
const SAMPLE_CARD = {
  pictureUrl: null,
  status: 'active',
  operatorName: 'Dima Grossman',
  issuedAt: '2026-10-03T12:00:00.000Z',
  telegramBot: '@atlas_bot',
} as const satisfies Partial<PublicAgentCard>;

/**
 * The public card of the agent with this handle, for the page at `/p/{handle}` and its share image. Once
 * the API answers it (NV-9032), there is none for a handle no agent has, for an agent that was deleted, and
 * for one only its contacts can reach (Who can reach, on the Configure page): the card is public only while
 * that is Anyone. Until then every handle shows `SAMPLE_CARD`.
 *
 * The page and its image of one request share a single lookup.
 */
export const getPublicAgentCard = cache(async (handle: string): Promise<PublicAgentCardResult> => {
  if (handle.length > HANDLE_MAX_LENGTH || !HANDLE_PATTERN.test(handle)) {
    return NOT_AVAILABLE;
  }

  // Until NV-9032 stores handles, no agent can be found by one. Once it does, this asks the API's public
  // endpoint for the card instead, and the API applies Who can reach.
  return {
    available: true,
    card: {
      ...SAMPLE_CARD,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      handle,
      address: addressOf(handle),
      cardLink: cardLinkOf(await readSiteOrigin(), handle),
    },
  };
});
