import { slugify } from '@novu/shared';

import { isValidAgentEmailSlugPrefix } from './agent-shared-inbox';

/** As long as an Agent Inbox handle may be. Matches `isValidAgentEmailSlugPrefix`. */
const HANDLE_MAX_LENGTH = 32;

/** How many numbered alternatives to try after the first nearby handle. */
const SUGGESTION_WALK_LIMIT = 50;

/**
 * Addresses nobody may claim, even when no inbox has them. The old onboarding
 * stand-in reserved the first eight; `postmaster` and `abuse` stay with the domain.
 */
const RESERVED_AGENT_INBOX_HANDLES = new Set([
  'abuse',
  'admin',
  'agent',
  'hello',
  'help',
  'inbox',
  'info',
  'postmaster',
  'support',
  'team',
]);

/** Mail providers whose domain says nothing about who the operator is. */
const SHARED_MAIL_DOMAINS = new Set(['gmail', 'googlemail', 'hotmail', 'icloud', 'live', 'me', 'outlook', 'proton']);

export function isReservedAgentInboxHandle(handle: string): boolean {
  return RESERVED_AGENT_INBOX_HANDLES.has(handle);
}

/**
 * The company from a work email, otherwise the mailbox name, otherwise `hq`.
 * Shared-mail domains (Gmail and the like) are skipped so the suffix is the person, not the provider.
 */
export function agentInboxIdentitySuffix(operatorEmail: string | null | undefined): string {
  const [mailbox = '', domain = ''] = (operatorEmail ?? '').toLowerCase().split('@');
  const company = slugForHandle(domain.split('.')[0] ?? '');
  const personal = slugForHandle(mailbox.split(/[.+_-]/)[0] ?? '');
  const own = company && !SHARED_MAIL_DOMAINS.has(company) ? company : personal;

  if (own && isValidAgentEmailSlugPrefix(own)) {
    return own;
  }

  return 'hq';
}

/** The handle a display name becomes. Missing when the name has nothing an address can hold. */
export function preferredAgentInboxHandle(name: string | null | undefined): string | undefined {
  const slug = slugForHandle(name ?? '');
  if (!slug || !isValidAgentEmailSlugPrefix(slug)) {
    return undefined;
  }

  return slug;
}

/**
 * Handles to offer after `start`, in order.
 * `nearby` skips `start` (it is already taken) and tries `{start}-{suffix}`, then `{that}-2`, `{that}-3`.
 * `number` tries `start` itself, then `{start}-2`, `{start}-3`. That is the walk for a name that
 * slugifies to nothing: the identity suffix is the handle, then numbers.
 */
export function agentInboxHandleCandidates(
  start: string,
  operatorEmail: string | null | undefined,
  style: 'nearby' | 'number'
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (candidate: string | undefined) => {
    if (!candidate || seen.has(candidate) || !isValidAgentEmailSlugPrefix(candidate)) {
      return;
    }

    if (style === 'nearby' && candidate === start) {
      return;
    }

    seen.add(candidate);
    candidates.push(candidate);
  };

  if (style === 'number') {
    push(start);
  }

  const suffix = agentInboxIdentitySuffix(operatorEmail);
  const nearby = style === 'nearby' ? withSuffix(start, suffix) : undefined;
  if (style === 'nearby') {
    push(nearby);
  }

  const numberedStem = style === 'nearby' ? (nearby ?? start) : start;
  for (let n = 2; n <= SUGGESTION_WALK_LIMIT && candidates.length < SUGGESTION_WALK_LIMIT; n += 1) {
    push(withSuffix(numberedStem, String(n)));
  }

  return candidates;
}

/** The first candidate `isTaken` allows, or nothing when the walk is exhausted. */
export function firstFreeAgentInboxHandle(
  start: string,
  operatorEmail: string | null | undefined,
  isTaken: (handle: string) => boolean,
  style: 'nearby' | 'number'
): string | undefined {
  for (const candidate of agentInboxHandleCandidates(start, operatorEmail, style)) {
    if (!isTaken(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function slugForHandle(input: string): string {
  return slugify(input).slice(0, HANDLE_MAX_LENGTH).replace(/^-+/, '').replace(/-+$/, '');
}

function withSuffix(stem: string, suffix: string): string | undefined {
  const maxStem = HANDLE_MAX_LENGTH - suffix.length - 1;
  if (maxStem < 1 || !suffix) {
    return undefined;
  }

  const trimmed = stem.slice(0, maxStem).replace(/-+$/g, '');
  if (!trimmed) {
    return undefined;
  }

  const candidate = `${trimmed}-${suffix}`;
  if (!isValidAgentEmailSlugPrefix(candidate)) {
    return undefined;
  }

  return candidate;
}
