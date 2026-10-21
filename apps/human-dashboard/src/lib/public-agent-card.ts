import 'server-only';

import { cache } from 'react';

import { unwrapData } from './api-response';
import { requestPublic } from './human-api';
import { HumanApiError } from './human-api-error';
import { cardLinkOf, HANDLE_MAX_LENGTH } from './onboarding';
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
  /** Who runs the agent, as the API names them for the card: "Run by Dima G.". Empty without a first name. */
  operatorName: string;
  /** When the agent was made, as an ISO timestamp: "issued Oct 3". */
  issuedAt: string;
  /** Its email address, which the card's code to scan and the page's Email start an email to. */
  address: string;
  /** Its Telegram bot's `@username`. `null` without Telegram: the card then leaves that line out. */
  telegramBot: string | null;
  /**
   * Whether the operator approves a stranger's first message before the agent gets it, which the page then
   * tells visitors. Never yet: a card is public only while anyone can reach the agent, and then a stranger's
   * message reaches it straight away.
   */
  approvesNewPeople: boolean;
  /** The card's own link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). */
  cardLink: string;
};

/** The card, or that there is none to show at this link. Which of the reasons it was is never told. */
export type PublicAgentCardResult = { available: true; card: PublicAgentCard } | { available: false };

/** The API's card (`GET /v1/human/agent-cards/:handle`), which holds only what the card shows. */
type AgentCardResponse = {
  handle: string;
  name: string;
  pictureUrl?: string;
  paused: boolean;
  operatorName?: string;
  createdAt: string;
  address: string;
  /** Without the `@`. */
  telegramBotUsername?: string;
};

const NOT_AVAILABLE: PublicAgentCardResult = { available: false };

/** What a handle can be: lowercase letters and digits, with single hyphens in between (see `toHandle`). */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The public card of the agent with this handle, for the page at `/p/{handle}` and its share image. The API
 * has none for a handle no agent has, for an agent that was deleted, and for one only its contacts can reach
 * (Who can reach, on the Configure page): the card is public only while that is Anyone.
 *
 * The page and its image of one request share a single lookup.
 */
export const getPublicAgentCard = cache(async (handle: string): Promise<PublicAgentCardResult> => {
  if (handle.length > HANDLE_MAX_LENGTH || !HANDLE_PATTERN.test(handle)) {
    return NOT_AVAILABLE;
  }

  let found: AgentCardResponse;
  try {
    // Agent Inbox has no EU region.
    found = unwrapData<AgentCardResponse>(await requestPublic('us', `/v1/human/agent-cards/${handle}`));
  } catch (error) {
    // Every reason there is no card is the same 404.
    if (error instanceof HumanApiError && error.status === 404) {
      return NOT_AVAILABLE;
    }

    throw error;
  }

  return {
    available: true,
    card: {
      name: found.name,
      handle: found.handle,
      pictureUrl: found.pictureUrl ?? null,
      status: found.paused ? 'paused' : 'active',
      operatorName: found.operatorName ?? '',
      issuedAt: found.createdAt,
      address: found.address,
      telegramBot: found.telegramBotUsername ? `@${found.telegramBotUsername}` : null,
      approvesNewPeople: false,
      cardLink: cardLinkOf(await readSiteOrigin(), found.handle),
    },
  };
});
