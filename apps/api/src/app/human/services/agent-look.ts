import {
  AGENT_CARD_ART_KINDS,
  AGENT_CARD_ART_MAX_SEED,
  AGENT_LOOK_COLORS,
  AGENT_MASCOT_BODIES,
  type AgentCardShown,
  type AgentEntity,
  type AgentLook,
} from '@novu/dal';
import type { AgentCardShownDto, AgentLookDto } from '../dtos/human-agent-look.dto';

/** The look every agent starts with, and the one an agent made before looks were picked keeps. */
export const ORIGINAL_AGENT_LOOK: AgentLook = { shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } };

/**
 * The agent's look as its mascot and card show it: the one its operator picked, else the original look. A look
 * stored in part, or with a value no longer known, reads as the original one too, never as half of each.
 */
export function agentLookOf(agent: Pick<AgentEntity, 'look'>): AgentLookDto {
  const look = agent.look;
  const art = look?.art;
  const known =
    look &&
    art &&
    (AGENT_MASCOT_BODIES as readonly string[]).includes(look.shape) &&
    (AGENT_LOOK_COLORS as readonly string[]).includes(look.color) &&
    (AGENT_CARD_ART_KINDS as readonly string[]).includes(art.kind) &&
    Number.isInteger(art.seed) &&
    art.seed >= 0 &&
    art.seed <= AGENT_CARD_ART_MAX_SEED;
  const chosen = known ? look : ORIGINAL_AGENT_LOOK;

  return { shape: chosen.shape, color: chosen.color, art: { kind: chosen.art.kind, seed: chosen.art.seed } };
}

/** The first time a host showed the agent's card, as the API answers it. Null before any host did. */
export function cardShownOf(agent: Pick<AgentEntity, 'cardShown'>): AgentCardShownDto | null {
  const shown: AgentCardShown | undefined = agent.cardShown;
  if (!shown?.at) {
    return null;
  }

  return {
    at: shown.at,
    ...(shown.via ? { via: shown.via } : {}),
    ...(shown.host ? { host: shown.host } : {}),
  };
}
