import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { type AgentHosts, type AgentHostVia, AgentRepository } from '@novu/dal';
import type { HumanHostDto, HumanHostStatusResponseDto } from '../dtos/human-host.dto';
import type { InboxThreadDto } from '../dtos/human-inbox.dto';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';

/**
 * The request header that says which way a host came in: `cli` from the `agentinbox` CLI, `mcp` from the
 * hosted MCP server. Both use the account's one key, so the key can't tell them apart. Requests without
 * it, such as the dashboard's own, are not a host checking the inbox.
 */
export const AGENT_INBOX_VIA_HEADER = 'agent-inbox-via';

export const AGENT_HOST_VIAS: readonly AgentHostVia[] = ['cli', 'mcp'];

/** A host polling the inbox writes its last check at most this often. */
const CHECK_WRITE_INTERVAL_MS = 60_000;

/** The way in a header names, or undefined for a request that is not a host's. */
export function readHostVia(header: unknown): AgentHostVia | undefined {
  const value = typeof header === 'string' ? header.trim().toLowerCase() : '';

  return AGENT_HOST_VIAS.find((via) => via === value);
}

/**
 * Which hosts act as an Agent Inbox agent: when each way in (CLI or MCP) first connected and last checked
 * the inbox, and the message that was waiting the first time a host looked. Kept on the agent. Recording
 * never fails what it follows: a host still gets its inbox when this can't be saved.
 */
@Injectable()
export class HumanHostStatusService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** A host used a one-time code. It is connected from now on, though it hasn't looked at the inbox yet. */
  async recordConnected(scope: InboxScope, agentId: string, via: AgentHostVia): Promise<void> {
    try {
      await this.agentRepository.update(
        agentQuery(scope, agentId),
        { $min: { [`hosts.${via}.connectedAt`]: new Date().toISOString() } },
        { timestamps: false }
      );
    } catch (error) {
      this.logger.warn({ err: error, agentId, via }, 'Failed to record a connected Agent Inbox host');
    }
  }

  /**
   * A host checked the inbox: it listed conversations or opened one, and was shown `seen`. The first check
   * of any host keeps the newest unread conversation it was shown: the message that was waiting for it.
   */
  async recordCheck(
    scope: InboxScope,
    agent: InboxRelayAgent,
    via: AgentHostVia,
    seen: InboxThreadDto[]
  ): Promise<void> {
    try {
      const now = new Date();
      const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['hosts']);
      const hosts = stored?.hosts;

      if (!hosts?.firstCheckedAt) {
        const waiting = seen.find((thread) => thread.unreadCount > 0);

        await this.agentRepository.update(
          { ...agentQuery(scope, agent._id), 'hosts.firstCheckedAt': { $exists: false } },
          {
            $set: {
              'hosts.firstCheckedAt': now.toISOString(),
              ...(waiting
                ? {
                    'hosts.waitingMessage': {
                      conversationId: waiting.id,
                      from: waiting.from,
                      subject: waiting.subject,
                      at: waiting.lastMessage?.at ?? waiting.lastActivityAt,
                      seenAt: now.toISOString(),
                    },
                  }
                : {}),
            },
          },
          { timestamps: false }
        );
      }

      const lastCheckedAt = hosts?.[via]?.lastCheckedAt;
      if (lastCheckedAt && now.getTime() - Date.parse(lastCheckedAt) < CHECK_WRITE_INTERVAL_MS) {
        return;
      }

      // The minute is checked again in the write itself: of checks that arrive together only one writes,
      // and a late one can't put an older time over a newer one. ISO times in UTC compare as strings.
      const field = `hosts.${via}.lastCheckedAt`;
      const cutoff = new Date(now.getTime() - CHECK_WRITE_INTERVAL_MS).toISOString();

      await this.agentRepository.update(
        { ...agentQuery(scope, agent._id), $or: [{ [field]: { $exists: false } }, { [field]: { $lte: cutoff } }] },
        {
          $set: { [`hosts.${via}.lastCheckedAt`]: now.toISOString() },
          $min: { [`hosts.${via}.connectedAt`]: now.toISOString() },
        },
        { timestamps: false }
      );
    } catch (error) {
      this.logger.warn({ err: error, agentId: agent._id, via }, 'Failed to record an Agent Inbox host check');
    }
  }

  /** Whether a host is connected, its last check, and what it found waiting the first time it looked. */
  async describe(scope: InboxScope, agent: InboxRelayAgent): Promise<HumanHostStatusResponseDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['hosts']);

    return describeHosts(stored?.hosts);
  }
}

export function describeHosts(hosts: AgentHosts | undefined): HumanHostStatusResponseDto {
  const list = AGENT_HOST_VIAS.flatMap((via): HumanHostDto[] => {
    const entry = hosts?.[via];
    const connectedAt = entry?.connectedAt ?? entry?.lastCheckedAt;

    return connectedAt ? [{ via, connectedAt, lastCheckedAt: entry?.lastCheckedAt ?? null }] : [];
  }).sort((a, b) => (b.lastCheckedAt ?? '').localeCompare(a.lastCheckedAt ?? ''));
  const lastCheck = list.find((host) => host.lastCheckedAt);
  const waiting = hosts?.waitingMessage;

  return {
    connected: list.length > 0,
    lastCheckedAt: lastCheck?.lastCheckedAt ?? null,
    lastCheckedVia: lastCheck?.via ?? null,
    hosts: list,
    firstCheckedAt: hosts?.firstCheckedAt ?? null,
    waitingMessage: waiting
      ? {
          conversationId: waiting.conversationId,
          from: waiting.from,
          subject: waiting.subject,
          at: waiting.at,
          seenAt: waiting.seenAt,
        }
      : null,
  };
}

function agentQuery(scope: InboxScope, agentId: string) {
  return { _id: agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId };
}
