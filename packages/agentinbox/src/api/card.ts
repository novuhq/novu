import { DEFAULT_RELAY_AGENT_IDENTIFIER } from '../config';
import { type ApiClient, unwrap } from './client';

/** How the agent looks, as the API answers it: its mascot's body and colour, and its card's art. */
export interface AgentLook {
  shape: string;
  color: string;
  art: { kind: string; seed: number };
}

/** The agent's card as `POST /v1/agent/card` answers it (the API's `POST /v1/human/agent/card`). */
export interface ShownCard {
  /** What the agent says as it shows its card: "Hi Ada, I’m Sid. I have my own inbox now. …" */
  greeting: string;
  name: string;
  /** The part of its address before the `@`. Missing while it has no address. */
  handle?: string;
  address?: string;
  /** Its public card, where anyone can email or message it. Missing while only its contacts can reach it. */
  url?: string;
  pictureUrl?: string;
  look: AgentLook;
  operatorFirstName?: string;
  /** Whether this was the first time any host showed the card. */
  firstShown: boolean;
}

/**
 * Shows the agent's card: the API answers with what the card holds, and keeps the first showing on the agent,
 * which is how agentinbox.md sees the agent say hi.
 */
export async function showCard(client: ApiClient, agentIdentifier?: string): Promise<ShownCard> {
  const body = agentIdentifier && agentIdentifier !== DEFAULT_RELAY_AGENT_IDENTIFIER ? { agentIdentifier } : {};
  const response = await client.axios.post('/v1/agent/card', body);

  return unwrap<ShownCard>(response.data);
}
