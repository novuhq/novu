import type { AgentInboxApi } from './agent-inbox-api';

/** The agent's card as `POST /v1/agent/card` answers it (the API's `POST /v1/human/agent/card`). */
export type ShownCard = {
  /** What the agent says as it shows its card: "Hi Ada, I’m Sid. I have my own inbox now. …" */
  greeting: string;
  name: string;
  /** The part of its address before the `@`. Missing while it has no address. */
  handle?: string;
  address?: string;
  /** Its public card, where anyone can email or message it. Missing while only its contacts can reach it. */
  url?: string;
  pictureUrl?: string;
  look: { shape: string; color: string; art: { kind: string; seed: number } };
  operatorFirstName?: string;
  /** Whether this was the first time any host showed the card. */
  firstShown: boolean;
};

/**
 * Shows the agent's card: the API answers with what the card holds, and keeps the first showing on the agent,
 * which is how agentinbox.md sees the agent say hi.
 */
export function showCard(api: AgentInboxApi): Promise<ShownCard> {
  return api.post<ShownCard>('/v1/agent/card', {});
}

/** The card as the AI tool says it: the greeting, then the name, the address and the link. */
export function cardText(card: ShownCard): string {
  return [
    card.greeting,
    '',
    card.name,
    ...(card.address ? [`Email: ${card.address}`] : []),
    ...(card.url ? [`Card: ${card.url} (anyone can email or message ${card.name} from there)`] : []),
  ].join('\n');
}
