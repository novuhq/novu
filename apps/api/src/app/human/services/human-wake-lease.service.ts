import { ConflictException, Injectable } from '@nestjs/common';
import { type AgentAwake, AgentRepository } from '@novu/dal';
import { agentPausedError } from '../../agents/human-relay/agent-paused.error';
import type { AwakeDto, WakeLeaseResponseDto, WakeLeaseStatusResponseDto } from '../dtos/human-wake.dto';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';

/** A lease lapses this long after its last renewal: a computer that went quiet stops keeping the agent awake. */
export const AWAKE_LEASE_SECONDS = 180;

/** How often the wake program renews the lease, well inside its lapse. */
export const AWAKE_RENEW_SECONDS = 60;

/** Machine-readable code of the answer to a computer that asks for the lease another computer holds. */
export const AWAKE_ELSEWHERE = 'awake_elsewhere';

/** Machine-readable code of the answer to a computer that waits for messages without holding the lease. */
export const NOT_AWAKE = 'not_awake';

/** Machine-readable code of the answer to a keyless setup asking for the lease: wake needs an account. */
export const WAKE_NEEDS_ACCOUNT = 'wake_needs_account';

/** Who holds the lease: a computer and the host it wakes there, together. */
export type WakeHolderId = Pick<AgentAwake, 'computerId' | 'host'>;

/** A computer asking for the lease for a host: who it is, and what it wakes where. */
export type WakeHolder = Pick<AgentAwake, 'computerId' | 'computerName' | 'host' | 'project'>;

/** Taken again while it was being read: a holder that let go meanwhile is asked once more, then no more. */
const TAKE_ATTEMPTS = 3;

/**
 * Which computer keeps an Agent Inbox agent awake, and for which host. Only one at a time: the `agentinbox wake`
 * running there holds a lease on the agent and renews it, and the lease lapses a few minutes after that computer
 * goes quiet. The holder is the computer and the host together, so the same computer waking another host is
 * another holder. Another holder can take it over when asked to; the one it was taken from learns at its next call.
 */
@Injectable()
export class HumanWakeLeaseService {
  constructor(private readonly agentRepository: AgentRepository) {}

  /** Takes, renews or takes over the lease. Another holder's live lease is a 409 `awake_elsewhere` without `takeOver`. */
  async take(
    scope: InboxScope,
    agent: InboxRelayAgent,
    holder: WakeHolder,
    takeOver: boolean
  ): Promise<WakeLeaseResponseDto> {
    for (let attempt = 1; ; attempt += 1) {
      const now = new Date();
      const taken = await this.agentRepository.takeAwake({
        ...scope,
        agentId: agent._id,
        holder,
        takeOver,
        now,
        leaseMs: AWAKE_LEASE_SECONDS * 1000,
      });

      if (taken) {
        return { awake: toAwakeDto(taken), renewInSeconds: AWAKE_RENEW_SECONDS };
      }

      const holderNow = await this.current(scope, agent);
      if (holderNow || attempt >= TAKE_ATTEMPTS) {
        throw awakeElsewhereError(holderNow);
      }
    }
  }

  /** Where the agent is awake now, or `null` when no computer holds a live lease. */
  async current(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<AwakeDto | null> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['awake']);

    return liveAwake(stored?.awake, new Date());
  }

  /** Where the agent is awake now, and whether the operator paused it, in one look: what `wake status` shows. */
  async status(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<WakeLeaseStatusResponseDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['awake', 'pausedAt']);

    return { awake: liveAwake(stored?.awake, new Date()), paused: Boolean(stored?.pausedAt) };
  }

  /** Lets go of the lease when `holder` holds it. Says whether it held a live one. */
  release(scope: InboxScope, agent: InboxRelayAgent, holder: WakeHolderId): Promise<boolean> {
    return this.agentRepository.releaseAwake({ ...scope, agentId: agent._id, holder, now: new Date() });
  }

  /**
   * The lease `holder` holds, for a call only the holder may make: waiting for messages. Anyone else gets a 409
   * `not_awake` with whoever holds it, if anyone. The agent's pause is read in the same look, so a wait that is
   * already under way stops when the operator pauses the agent.
   */
  async assertHolds(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>, holder: WakeHolderId): Promise<AwakeDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['awake', 'pausedAt']);

    if (stored?.pausedAt) {
      throw agentPausedError(stored.pausedAt);
    }

    const awake = liveAwake(stored?.awake, new Date());
    if (awake?.computerId !== holder.computerId || awake.host !== holder.host) {
      throw new ConflictException({
        code: NOT_AWAKE,
        message: awake
          ? `${describeAwake(awake)} keeps this agent awake now, not ${holder.host} on this computer.`
          : `${holder.host} on this computer doesn’t keep this agent awake: its lease lapsed or was let go. Take it again first.`,
        awake,
      });
    }

    return awake;
  }
}

/** The stored lease as the API describes it, or `null` once it has lapsed: a lapsed lease is no lease. */
export function liveAwake(awake: AgentAwake | null | undefined, now: Date): AwakeDto | null {
  if (!awake?.computerId || !awake.expiresAt || awake.expiresAt <= now.toISOString()) {
    return null;
  }

  return toAwakeDto(awake);
}

function toAwakeDto(awake: AgentAwake): AwakeDto {
  return {
    computerId: awake.computerId,
    computerName: awake.computerName,
    host: awake.host,
    ...(awake.project ? { project: awake.project } : {}),
    since: awake.since,
    renewedAt: awake.renewedAt,
    expiresAt: awake.expiresAt,
  };
}

function awakeElsewhereError(awake: AwakeDto | null): ConflictException {
  return new ConflictException({
    code: AWAKE_ELSEWHERE,
    message: awake
      ? `${describeAwake(awake)} keeps this agent awake. Take it over to keep it awake here instead.`
      : 'Another computer keeps this agent awake.',
    awake,
  });
}

/** "MacBook (claude-code)", as an error names the computer holding the lease. */
function describeAwake(awake: AwakeDto): string {
  return `${awake.computerName} (${awake.host})`;
}

function agentQuery(scope: InboxScope, agentId: string) {
  return { _id: agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId };
}
