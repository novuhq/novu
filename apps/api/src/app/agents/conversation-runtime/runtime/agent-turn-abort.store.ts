import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** The turn a conversation is running, recorded at bridge dispatch so a Stop on any pod can find it. */
export interface ActiveAgentTurn {
  /** The bridge `deliveryId`; the framework stamps it on every event envelope of the turn as `turnId`. */
  turnId: string;
  /** The inbound message that started the turn, as the bridge reads it in `message.platformMessageId`. */
  platformMessageId?: string;
}

const ACTIVE_TURN_TTL_SECONDS = 15 * 60;
const ABORTED_TURN_TTL_SECONDS = 60 * 60;

/** Deletes the active turn only while it is still `ARGV[1]`, so a newer turn's dispatch is never cleared. */
const CLEAR_ACTIVE_TURN_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if value and cjson.decode(value).turnId == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

function activeTurnKey(conversationId: string): string {
  return `agent:active-turn:${conversationId}`;
}

function abortedTurnKey(turnId: string): string {
  return `agent:turn-aborted:${turnId}`;
}

/**
 * The Redis keys behind Stop: the turn each conversation is running and the turns a user aborted. Every pod
 * reads them at points it already passes (dispatch, event ingest, the live reader), so no pub/sub is needed.
 */
@Injectable()
export class AgentTurnAbortStore {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Fails soft: a dispatch must never fail because Stop could not record its turn. */
  async setActiveTurn(conversationId: string, turn: ActiveAgentTurn): Promise<void> {
    try {
      await this.cacheService.set(activeTurnKey(conversationId), JSON.stringify(turn), {
        ttl: ACTIVE_TURN_TTL_SECONDS,
      });
    } catch (err) {
      this.logger.warn({ err, conversationId, turnId: turn.turnId }, 'Failed to record the active agent turn');
    }
  }

  async getActiveTurn(conversationId: string): Promise<ActiveAgentTurn | null> {
    const raw = await this.cacheService.get(activeTurnKey(conversationId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ActiveAgentTurn>;
      if (typeof parsed.turnId !== 'string' || !parsed.turnId) {
        return null;
      }

      return {
        turnId: parsed.turnId,
        ...(typeof parsed.platformMessageId === 'string' ? { platformMessageId: parsed.platformMessageId } : {}),
      };
    } catch {
      return null;
    }
  }

  /** Called once a turn finished, so a later Stop finds nothing to abort. Fails soft: the key also expires. */
  async clearActiveTurn(conversationId: string, turnId: string): Promise<void> {
    try {
      await this.cacheService.eval(CLEAR_ACTIVE_TURN_SCRIPT, [activeTurnKey(conversationId)], [turnId]);
    } catch (err) {
      this.logger.warn({ err, conversationId, turnId }, 'Failed to clear the active agent turn');
    }
  }

  async markAborted(turnId: string): Promise<void> {
    await this.cacheService.set(abortedTurnKey(turnId), 1, { ttl: ABORTED_TURN_TTL_SECONDS });
  }

  /** Fails open: when Redis can't answer, the turn keeps delivering rather than dropping a live reply. */
  async isAborted(turnId: string): Promise<boolean> {
    try {
      return (await this.cacheService.get(abortedTurnKey(turnId))) === '1';
    } catch (err) {
      this.logger.warn({ err, turnId }, 'Failed to read the agent turn abort marker');

      return false;
    }
  }
}
