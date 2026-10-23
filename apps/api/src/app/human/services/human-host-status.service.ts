import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AGENT_HOST_IDS,
  AGENT_HOST_VIAS,
  type AgentHostId,
  type AgentHosts,
  type AgentHostVia,
  type AgentNamedHostEntry,
  AgentRepository,
} from '@novu/dal';
import type { HumanHostDto, HumanHostStatusResponseDto } from '../dtos/human-host.dto';
import type { InboxThreadDto } from '../dtos/human-inbox.dto';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';

/**
 * The request header that says which way a host came in: `cli` from the `agentinbox` CLI, `mcp` from the
 * hosted MCP server. Both use the account's one key, so the key can't tell them apart. Requests without
 * it, such as the dashboard's own, are not a host checking the inbox.
 */
export const AGENT_INBOX_VIA_HEADER = 'agent-inbox-via';

/**
 * The request header that says which host it is, as one of `AGENT_HOST_IDS`: the CLI reads it from the
 * shell the host runs it in, the MCP server from the name the app gave when it connected. A host that
 * doesn't say, or names one Agent Inbox doesn't know, counts as `general`.
 */
export const AGENT_INBOX_HOST_HEADER = 'agent-inbox-host';

/** Any other host, and any host that didn't say which one it is. */
export const GENERAL_HOST: AgentHostId = 'general';

/** A host polling the inbox writes its last check at most this often. */
const CHECK_WRITE_INTERVAL_MS = 60_000;

/** A host coming in: the way it came, and which host it said it is. */
export type RequestingHost = { via: AgentHostVia; id?: AgentHostId };

/** The way in a header names, or undefined for a request that is not a host's. */
export function readHostVia(header: unknown): AgentHostVia | undefined {
  const value = typeof header === 'string' ? header.trim().toLowerCase() : '';

  return AGENT_HOST_VIAS.find((via) => via === value);
}

/** The host a header names, or undefined for none, or one Agent Inbox doesn't know. */
export function readHostId(header: unknown): AgentHostId | undefined {
  const value = typeof header === 'string' ? header.trim().toLowerCase() : '';

  return AGENT_HOST_IDS.find((id) => id === value);
}

/**
 * Which hosts act as an Agent Inbox agent: when each host first connected and last checked the inbox, the
 * way it came in (CLI or MCP), and the message that was waiting the first time a host looked. Kept on the
 * agent, one entry per host: two computers running the same host, or a host that came in both ways, are one.
 * Recording never fails what it follows: a host still gets its inbox when this can't be saved.
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
  async recordConnected(scope: InboxScope, agentId: string, host: RequestingHost): Promise<void> {
    const entry = entryPath(host);

    try {
      await this.agentRepository.update(
        agentQuery(scope, agentId),
        {
          $min: { [`${entry}.connectedAt`]: new Date().toISOString() },
          $set: { [`${entry}.via`]: host.via },
        },
        { timestamps: false }
      );
    } catch (error) {
      this.logger.warn({ err: error, agentId, host }, 'Failed to record a connected Agent Inbox host');
    }
  }

  /**
   * A host checked the inbox: it listed conversations or opened one, and was shown `seen`. The first check
   * of any host keeps the newest unread conversation it was shown: the message that was waiting for it.
   */
  async recordCheck(
    scope: InboxScope,
    agent: InboxRelayAgent,
    host: RequestingHost,
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

      const lastCheckedAt = hosts?.byId?.[host.id ?? GENERAL_HOST]?.lastCheckedAt;
      if (lastCheckedAt && now.getTime() - Date.parse(lastCheckedAt) < CHECK_WRITE_INTERVAL_MS) {
        return;
      }

      // The minute is checked again in the write itself: of checks that arrive together only one writes,
      // and a late one can't put an older time over a newer one. ISO times in UTC compare as strings.
      const entry = entryPath(host);
      const field = `${entry}.lastCheckedAt`;
      const cutoff = new Date(now.getTime() - CHECK_WRITE_INTERVAL_MS).toISOString();

      await this.agentRepository.update(
        { ...agentQuery(scope, agent._id), $or: [{ [field]: { $exists: false } }, { [field]: { $lte: cutoff } }] },
        {
          $set: { [field]: now.toISOString(), [`${entry}.via`]: host.via },
          $min: { [`${entry}.connectedAt`]: now.toISOString() },
        },
        { timestamps: false }
      );
    } catch (error) {
      this.logger.warn({ err: error, agentId: agent._id, host }, 'Failed to record an Agent Inbox host check');
    }
  }

  /** Which hosts are connected, each with its last check, and what the first one found waiting when it looked. */
  async describe(scope: InboxScope, agent: InboxRelayAgent): Promise<HumanHostStatusResponseDto> {
    const stored = await this.agentRepository.findOne(agentQuery(scope, agent._id), ['hosts']);

    return describeHosts(stored?.hosts);
  }
}

/**
 * One entry for each host, last checked first. Before hosts were told apart, the agent kept one entry for
 * each way in (`hosts.cli`, `hosts.mcp`), whichever host it was: those show as one `general` entry, until a
 * host with a name has checked the inbox. Their times still count for the agent as a whole until then.
 */
export function describeHosts(hosts: AgentHosts | undefined): HumanHostStatusResponseDto {
  const named = AGENT_HOST_IDS.flatMap((id) => toHosts(id, hosts?.byId?.[id]));
  const fromBefore = named.some((host) => host.lastCheckedAt)
    ? []
    : AGENT_HOST_VIAS.flatMap((via) => toHosts(GENERAL_HOST, hosts?.[via], via));
  const list = mergeSameHost([...named, ...fromBefore]).sort(
    (a, b) => (b.lastCheckedAt ?? '').localeCompare(a.lastCheckedAt ?? '') || b.connectedAt.localeCompare(a.connectedAt)
  );
  const lastCheck = list.find((host) => host.lastCheckedAt);
  const waiting = hosts?.waitingMessage;

  return {
    connected: list.length > 0,
    lastCheckedAt: lastCheck?.lastCheckedAt ?? null,
    lastCheckedVia: lastCheck?.via ?? null,
    lastCheckedHost: lastCheck?.id ?? null,
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

/**
 * A stored entry as the API describes it, or nothing for one with no time in it. An entry from before hosts
 * were told apart came in the way it is kept under (`via`).
 */
function toHosts(
  id: AgentHostId,
  entry: AgentNamedHostEntry | undefined,
  via: AgentHostVia | undefined = entry?.via
): HumanHostDto[] {
  const connectedAt = entry?.connectedAt ?? entry?.lastCheckedAt;

  return connectedAt ? [{ id, via: via ?? 'cli', connectedAt, lastCheckedAt: entry?.lastCheckedAt ?? null }] : [];
}

/** Entries of one host as one: connected first when any of them was, checked last when any of them was. */
function mergeSameHost(list: HumanHostDto[]): HumanHostDto[] {
  const byId = new Map<AgentHostId, HumanHostDto>();

  for (const host of list) {
    const known = byId.get(host.id);
    if (!known) {
      byId.set(host.id, host);
      continue;
    }

    const latest = latestOf(host) > latestOf(known) ? host : known;
    byId.set(host.id, {
      id: host.id,
      via: latest.via,
      connectedAt: host.connectedAt < known.connectedAt ? host.connectedAt : known.connectedAt,
      lastCheckedAt:
        (host.lastCheckedAt ?? '') > (known.lastCheckedAt ?? '') ? host.lastCheckedAt : known.lastCheckedAt,
    });
  }

  return [...byId.values()];
}

function latestOf(host: HumanHostDto): string {
  return host.lastCheckedAt && host.lastCheckedAt > host.connectedAt ? host.lastCheckedAt : host.connectedAt;
}

/** Where a host's entry lives on the agent. The id is one of `AGENT_HOST_IDS`, so it is safe in a field path. */
function entryPath(host: RequestingHost): string {
  return `hosts.byId.${host.id ?? GENERAL_HOST}`;
}

function agentQuery(scope: InboxScope, agentId: string) {
  return { _id: agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId };
}
