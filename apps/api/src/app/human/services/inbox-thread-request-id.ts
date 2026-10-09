import { shortId } from '@novu/application-generic';

const INBOX_THREAD_REQUEST_PREFIX = 'inbox_';
const INBOX_OPEN_THREAD_REQUEST_PREFIX = 'inbox_any_';

/**
 * `requestId` of an interaction the host sent into an inbox thread. The `inbox_any_` form means
 * the host named nobody, so anyone in the thread may answer, including people who are not subscribers.
 */
export function buildInboxThreadRequestId(anyoneMayAnswer: boolean): string {
  return `${anyoneMayAnswer ? INBOX_OPEN_THREAD_REQUEST_PREFIX : INBOX_THREAD_REQUEST_PREFIX}${shortId(12)}`;
}

export function isOpenThreadInteraction(interaction: { requestId?: string; _conversationId?: string }): boolean {
  return Boolean(interaction._conversationId && interaction.requestId?.startsWith(INBOX_OPEN_THREAD_REQUEST_PREFIX));
}
