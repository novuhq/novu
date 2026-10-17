import type { ToolId } from './ai-tools';
import type { HostVia } from './onboarding';

/*
 * The hosts of the operator's agent, as `GET /v1/human/agent/hosts` describes them, and the one-time codes
 * a new host connects with (`POST /v1/human/agent/connect-codes`), with what became of each
 * (`POST /v1/human/agent/connect-codes/status`). The server reads them (`human-hosts-api.ts`); what's here
 * is what the pages work out from them, in the browser as well.
 */

/** One way hosts came in: the `agentinbox` CLI, or the hosted MCP server the chat apps connect through. */
export type AgentHost = {
  via: HostVia;
  /** When a host first came in this way: it used a code, or checked the inbox. */
  connectedAt: string;
  /** When a host last checked the inbox this way. */
  lastCheckedAt: string | null;
};

export type HostStatus = {
  /** A host used a one-time code, or checked the inbox, at least once. It never goes back to false. */
  connected: boolean;
  /** The last time any host checked the inbox. */
  lastCheckedAt: string | null;
  lastCheckedVia: HostVia | null;
  /** One entry for each way hosts came in, last checked first. */
  hosts: AgentHost[];
  /** The first time any host checked the inbox. */
  firstCheckedAt: string | null;
  /** The newest unread conversation the first check found. */
  waitingMessage: { conversationId: string; from: string; subject: string; at: string; seenAt: string } | null;
};

/** A one-time code for `agentinbox connect <handle> --code <code>`. It works once, for ten minutes. */
export type ConnectCode = {
  /** Eight letters, as `BCDF-GHJK`. */
  code: string;
  /** The agent it connects to, as the command names it. */
  handle: string;
  expiresAt: string;
};

/** What the server answers when asked for a code. `expiresInMs` is measured on the server, against its own clock. */
export type ConnectCodeResult = { ok: true; code: ConnectCode; expiresInMs: number } | { ok: false; error: string };

/**
 * What became of a code: `unused` while it can still connect a host, `used` once a host connected with it,
 * `expired` once it ran out, or once the account's key changed after it was made.
 */
export type ConnectCodeStatus = 'unused' | 'used' | 'expired';

/** A code as `POST /v1/human/agent/connect-codes/status` describes it. */
export type ConnectCodeCheck = {
  code: string;
  status: ConnectCodeStatus;
  expiresAt: string;
  /** When a host used it. Only on a `used` code. */
  usedAt?: string;
};

/**
 * What a drawer learns about a code it showed: its status, `unknown` when the API doesn't know it for this
 * agent (it lets a code go an hour after making it), or `null` when it couldn't be asked just now.
 */
export type CodeStatusResult = ConnectCodeStatus | 'unknown' | null;

/**
 * What the connect drawers ask the server while they're open: the page hands them its server actions, and
 * a page with other ones (the onboarding) can hand them its own.
 */
export type ConnectApi = {
  /** A one-time code for the agent `handle` names. */
  createCode: (handle: string) => Promise<ConnectCodeResult>;
  /** What became of a code the drawer showed for the agent `handle` names (`useCodeWatch`). */
  readCodeStatus: (handle: string, code: string) => Promise<CodeStatusResult>;
  /** The host status, or `null` when it can't be read just now. */
  readHosts: () => Promise<HostStatus | null>;
  /** Whether a chat app has signed in to the account through the MCP server. */
  isToolSignedIn: (tool: ToolId) => Promise<boolean>;
};

/**
 * A host that hasn't checked the inbox for this long no longer counts as connected. The API keeps
 * `connected` once a host ever came in, so only the last check can tell that it stopped.
 */
export const HOST_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** What a page's poll goes by before any host checked the inbox (`HostCheckPoll`). */
export const NEVER_CHECKED = 'never';

/**
 * - `live`: a host checked the inbox within the last day;
 * - `stale`: one did, but longer ago than that;
 * - `never`: no host has checked it yet, though one may have used a code already.
 *
 * Only `live` reads as connected.
 */
export type HostLiveness = 'live' | 'stale' | 'never';

export function hostLiveness(lastCheckedAt: string | null | undefined, now: number): HostLiveness {
  const checkedAt = lastCheckedAt ? Date.parse(lastCheckedAt) : Number.NaN;
  if (Number.isNaN(checkedAt)) {
    return 'never';
  }

  return now - checkedAt > HOST_STALE_AFTER_MS ? 'stale' : 'live';
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long ago a host checked, as the design writes it after "checked": "just now", "2m ago", "3h ago", "4d ago". */
export function formatCheckedAgo(iso: string, now: number): string {
  const ago = Math.max(0, now - Date.parse(iso));

  if (Number.isNaN(ago) || ago < MINUTE) {
    return 'just now';
  }

  if (ago < HOUR) {
    return `${Math.floor(ago / MINUTE)}m ago`;
  }

  if (ago < DAY) {
    return `${Math.floor(ago / HOUR)}h ago`;
  }

  return `${Math.floor(ago / DAY)}d ago`;
}

/**
 * The way a host came in since `before`, or `null`: a way no host had used, or one whose hosts had stopped
 * checking (`HOST_STALE_AFTER_MS`) and checked again.
 *
 * Another host on a way that is already in use doesn't show here: the API keeps when the first one came
 * in, and a check of the new one looks like a check of the old. The code it used tells that one apart
 * (`useCodeWatch`).
 */
export function findNewHost(before: HostStatus, after: HostStatus): HostVia | null {
  for (const host of after.hosts) {
    const known = before.hosts.find((entry) => entry.via === host.via);
    if (!known || known.connectedAt !== host.connectedAt) {
      return host.via;
    }

    if (host.lastCheckedAt && host.lastCheckedAt !== known.lastCheckedAt) {
      const checkedAt = Date.parse(host.lastCheckedAt);
      const knownCheckedAt = known.lastCheckedAt ? Date.parse(known.lastCheckedAt) : Number.NaN;

      if (Number.isNaN(knownCheckedAt) || checkedAt - knownCheckedAt > HOST_STALE_AFTER_MS) {
        return host.via;
      }
    }
  }

  return null;
}
