import { ConflictException, Injectable } from '@nestjs/common';
import { type AgentListening, AgentRepository } from '@novu/dal';
import { agentPausedError } from '../../agents/human-relay/agent-paused.error';
import type { ListeningDto, ListenLeaseResponseDto, ListenLeaseStatusResponseDto } from '../dtos/human-listen.dto';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';

/** A lease lapses this long after its last renewal: a computer that went quiet stops keeping the agent listening. */
export const LISTEN_LEASE_SECONDS = 180;

/** How often the listener renews the lease, well inside its lapse. */
export const LISTEN_RENEW_SECONDS = 60;

/** Machine-readable code of the answer to a computer that asks for the lease another computer holds. */
export const LISTENING_ELSEWHERE = 'listening_elsewhere';

/** Machine-readable code of the answer to a computer that waits for messages without holding the lease. */
export const NOT_LISTENING = 'not_listening';

/** Machine-readable code of the answer to a keyless setup asking for the lease: listening needs an account. */
export const LISTEN_NEEDS_ACCOUNT = 'listen_needs_account';

/** Who holds the lease: a computer and the host it starts there, together. */
export type ListenHolderId = Pick<AgentListening, 'computerId' | 'host'>;

/** A computer asking for the lease for a host: who it is, and what it starts where. */
export type ListenHolder = Pick<AgentListening, 'computerId' | 'computerName' | 'host' | 'project'>;

/** Taken again while it was being read: a holder that let go meanwhile is asked once more, then no more. */
const TAKE_ATTEMPTS = 3;

/**
 * Which computer keeps an Agent Inbox agent listening, and for which host. Only one at a time: the
 * `agentinbox listen` running there holds a lease on the agent and renews it, and the lease lapses a few minutes
 * after that computer goes quiet. The holder is the computer and the host together, so the same computer starting
 * another host is another holder. Another holder can take it over when asked to; the one it was taken from learns at its next call.
 */
@Injectable()
export class HumanListenLeaseService {
  constructor(private readonly agentRepository: AgentRepository) {}

  /** Takes, renews or takes over the lease. Another holder's live lease is a 409 `listening_elsewhere` without `takeOver`. */
  async take(
    scope: InboxScope,
    agent: InboxRelayAgent,
    holder: ListenHolder,
    takeOver: boolean
  ): Promise<ListenLeaseResponseDto> {
    for (let attempt = 1; ; attempt += 1) {
      const now = new Date();
      const taken = await this.agentRepository.takeListening({
        ...scope,
        agentId: agent._id,
        holder,
        takeOver,
        now,
        leaseMs: LISTEN_LEASE_SECONDS * 1000,
      });

      if (taken) {
        return { listening: toListeningDto(taken), renewInSeconds: LISTEN_RENEW_SECONDS };
      }

      const holderNow = await this.current(scope, agent);
      if (holderNow || attempt >= TAKE_ATTEMPTS) {
        throw listeningElsewhereError(holderNow);
      }
    }
  }

  /** Where the agent is listening now, or `null` when no computer holds a live lease. */
  async current(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<ListeningDto | null> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['listening']);

    return liveListening(stored?.listening, new Date());
  }

  /** Where the agent is listening now, and whether the operator paused it, in one look: what `listen status` shows. */
  async status(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<ListenLeaseStatusResponseDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['listening', 'pausedAt']);

    return { listening: liveListening(stored?.listening, new Date()), paused: Boolean(stored?.pausedAt) };
  }

  /** Lets go of the lease when `holder` holds it. Says whether it held a live one. */
  release(scope: InboxScope, agent: InboxRelayAgent, holder: ListenHolderId): Promise<boolean> {
    return this.agentRepository.releaseListening({ ...scope, agentId: agent._id, holder, now: new Date() });
  }

  /**
   * The lease `holder` holds, for a call only the holder may make: waiting for messages. Anyone else gets a 409
   * `not_listening` with whoever holds it, if anyone. The agent's pause is read in the same look, so a wait that is
   * already under way stops when the operator pauses the agent.
   */
  async assertHolds(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    holder: ListenHolderId
  ): Promise<ListeningDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['listening', 'pausedAt']);

    if (stored?.pausedAt) {
      throw agentPausedError(stored.pausedAt);
    }

    const listening = liveListening(stored?.listening, new Date());
    if (listening?.computerId !== holder.computerId || listening.host !== holder.host) {
      throw new ConflictException({
        code: NOT_LISTENING,
        message: listening
          ? `${describeListening(listening)} keeps this agent listening now, not ${holder.host} on this computer.`
          : `${holder.host} on this computer doesn’t keep this agent listening: its lease lapsed or was let go. Take it again first.`,
        listening,
      });
    }

    return listening;
  }
}

/** The stored lease as the API describes it, or `null` once it has lapsed: a lapsed lease is no lease. */
export function liveListening(listening: AgentListening | null | undefined, now: Date): ListeningDto | null {
  if (!listening?.computerId || !listening.expiresAt || listening.expiresAt <= now.toISOString()) {
    return null;
  }

  return toListeningDto(listening);
}

function toListeningDto(listening: AgentListening): ListeningDto {
  return {
    computerId: listening.computerId,
    computerName: listening.computerName,
    host: listening.host,
    ...(listening.project ? { project: listening.project } : {}),
    since: listening.since,
    renewedAt: listening.renewedAt,
    expiresAt: listening.expiresAt,
  };
}

function listeningElsewhereError(listening: ListeningDto | null): ConflictException {
  return new ConflictException({
    code: LISTENING_ELSEWHERE,
    message: listening
      ? `${describeListening(listening)} keeps this agent listening. Take it over to keep it listening here instead.`
      : 'Another computer keeps this agent listening.',
    listening,
  });
}

/** "MacBook (claude-code)", as an error names the computer holding the lease. */
function describeListening(listening: ListeningDto): string {
  return `${listening.computerName} (${listening.host})`;
}

function agentQuery(scope: InboxScope, agentId: string) {
  return { _id: agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId };
}
