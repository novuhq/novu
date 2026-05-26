/**
 * Session-scoped marker that "this browsing session began from a Clerk invitation link"
 * (i.e. the `__clerk_ticket` query param was present on `/auth/sign-in` or `/auth/sign-up`).
 *
 * Needed because Clerk consumes `__clerk_ticket` during the sign-in/sign-up handshake — by
 * the time the user reaches the post-auth org-list, the ticket is gone from the URL but we
 * still need to know that the just-created membership came from an invite. The cross-product
 * redirect should ONLY fire in that case; firing it for, say, a user who just deleted their
 * only Connect workspace would bounce them off Connect entirely.
 */

import { readClerkAuthParamFromLocation } from '@/utils/product-auth-urls';

const CLERK_TICKET_PARAM = '__clerk_ticket';
const FLAG_KEY = 'novu.inviteAcceptPending';
const FLAG_VALUE = '1';

export function markInvitationAcceptIfPresent(searchParams: URLSearchParams): void {
  if (typeof window === 'undefined') return;

  if (!readClerkAuthParamFromLocation(CLERK_TICKET_PARAM, searchParams)) {
    return;
  }

  try {
    window.sessionStorage.setItem(FLAG_KEY, FLAG_VALUE);
  } catch {
    // sessionStorage unavailable (private mode / quota) — silently skip.
  }
}

export function isInvitationAcceptPending(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(FLAG_KEY) === FLAG_VALUE;
  } catch {
    return false;
  }
}

export function clearInvitationAcceptPending(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // Same as above — non-fatal.
  }
}
