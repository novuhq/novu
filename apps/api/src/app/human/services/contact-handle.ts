import { HumanChannelViaEnum } from '@novu/shared';

/**
 * How a contact shows on a chat app, so the contact card can say "@dima" or "dima · acme.slack.com" instead of
 * just "Telegram" or "Slack". Agent Inbox keeps it on the contact's channel endpoint, next to `chatId` (Telegram)
 * or `userId` (Slack). The endpoint's `endpoint` field takes any shape, so this needs no schema change; senders
 * only read `chatId` / `userId`, and lookups match those by path, so the extra fields change nothing for them.
 */
export type ContactHandle = {
  /** Telegram username, without the @. Not everyone on Telegram has one. */
  username?: string;
  /** Telegram: first and last name. Slack: display name, else real name. */
  displayName?: string;
  /** Slack: the workspace's domain, such as `acme.slack.com`. */
  workspaceDomain?: string;
};

export const CONTACT_HANDLE_FIELDS = ['username', 'displayName', 'workspaceDomain'] as const;

/** Long enough for any real name or handle, short enough that a strange payload can't fill the endpoint. */
const MAX_HANDLE_LENGTH = 128;

/** The handle kept on an endpoint's data, leaving out anything that isn't a usable string. */
export function readContactHandle(endpoint: unknown): ContactHandle {
  const data = asRecord(endpoint);
  const handle: ContactHandle = {};

  for (const field of CONTACT_HANDLE_FIELDS) {
    const value = clean(data?.[field]);
    if (value) {
      handle[field] = value;
    }
  }

  return handle;
}

/**
 * What a Telegram user says about themselves: the `from` of a message or of a button press. The username comes
 * without its @; the name is first and last name together. `undefined` when there's no user to read.
 */
export function telegramHandleOf(from: unknown): ContactHandle | undefined {
  const user = asRecord(from);
  if (!user || user.id === undefined) {
    return undefined;
  }

  const username = clean(typeof user.username === 'string' ? user.username.replace(/^@+/, '') : undefined);
  const displayName = clean([clean(user.first_name), clean(user.last_name)].filter(Boolean).join(' '));

  return {
    ...(username ? { username } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

/**
 * The Slack name on a message's author: the chat SDK fills `userName` with the display name, else the real name.
 * When Slack couldn't tell who it was, the SDK puts the user id there instead, which is no name at all.
 */
export function slackDisplayNameOf(
  author: { userId?: string; userName?: string; fullName?: string } | null | undefined
): string | undefined {
  for (const candidate of [author?.userName, author?.fullName]) {
    const name = clean(candidate);
    if (name && name !== author?.userId && name !== 'unknown') {
      return name;
    }
  }

  return undefined;
}

/** The name in a Slack `users.info` answer: the display name, else the real name. */
export function slackDisplayNameOfUser(user: unknown): string | undefined {
  const record = asRecord(user);
  const profile = asRecord(record?.profile);

  return clean(profile?.display_name) ?? clean(profile?.real_name) ?? clean(record?.real_name);
}

/** `acme.slack.com` from the `team.domain` (`acme`) a Slack button press carries. */
export function slackWorkspaceDomainOfAction(raw: unknown): string | undefined {
  const domain = clean(asRecord(asRecord(raw)?.team)?.domain);

  return domain && /^[a-z0-9-]+$/i.test(domain) ? `${domain.toLowerCase()}.slack.com` : undefined;
}

/** `acme.slack.com` from the workspace address Slack's `auth.test` answers with (`https://acme.slack.com/`). */
export function slackWorkspaceDomainOfUrl(url: unknown): string | undefined {
  const value = clean(url);
  if (!value) {
    return undefined;
  }

  try {
    return clean(new URL(value).hostname.toLowerCase());
  } catch {
    return undefined;
  }
}

/**
 * The `$set` and `$unset` that turn the handle kept on an endpoint into `next`, or `null` when they already match.
 * Paths point inside the endpoint's data, so `chatId` / `userId` next to them stay as they are.
 */
export function contactHandleUpdate(
  stored: ContactHandle,
  next: ContactHandle
): { $set?: Record<string, string>; $unset?: Record<string, ''> } | null {
  const $set: Record<string, string> = {};
  const $unset: Record<string, ''> = {};

  for (const field of CONTACT_HANDLE_FIELDS) {
    const value = clean(next[field]);
    if (value && value !== stored[field]) {
      $set[`endpoint.${field}`] = value;
    } else if (!value && stored[field]) {
      $unset[`endpoint.${field}`] = '';
    }
  }

  const hasSet = Object.keys($set).length > 0;
  const hasUnset = Object.keys($unset).length > 0;
  if (!hasSet && !hasUnset) {
    return null;
  }

  return { ...(hasSet ? { $set } : {}), ...(hasUnset ? { $unset } : {}) };
}

/**
 * What the contact card shows for a channel. Telegram: `@username`, else their name. Slack: their name and,
 * apart, the workspace. Nothing for email, whose address is shown on its own, or when nothing is known yet.
 */
export function describeContactHandle(
  via: HumanChannelViaEnum,
  handle: ContactHandle | undefined
): { handle?: string; workspace?: string } {
  if (via === HumanChannelViaEnum.TELEGRAM) {
    const shown = handle?.username ? `@${handle.username}` : handle?.displayName;

    return shown ? { handle: shown } : {};
  }

  if (via === HumanChannelViaEnum.SLACK) {
    return {
      ...(handle?.displayName ? { handle: handle.displayName } : {}),
      ...(handle?.workspaceDomain ? { workspace: handle.workspaceDomain } : {}),
    };
  }

  return {};
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, MAX_HANDLE_LENGTH) : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}
