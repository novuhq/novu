import { type CopilotViewing, CopilotViewingResourceEnum } from '@novu/shared';
import type { CopilotPageView } from '@/components/copilot-web-chat/copilot-page-view-store';
import { getSubscriberFullName } from './utils';

/** The question about the subscriber open in the drawer; it leads the Copilot's suggestions. */
export const SUBSCRIBER_REACHABILITY_QUESTION = 'Can this subscriber be reached on every channel?';

/**
 * What the subscriber drawer shows: the open subscriber, labelled with their name once loaded and their subscriberId
 * before. It never reads the email or phone fields. The subscriberId goes as is, even when a customer uses an email or
 * phone number as one: the agent looks the subscriber up by it.
 */
export function buildSubscriberViewing(
  subscriberId: string,
  subscriber?: { firstName?: string | null; lastName?: string | null }
): CopilotViewing {
  const name = subscriber ? getSubscriberFullName(subscriber) : '';

  return {
    resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: subscriberId, label: name || subscriberId },
  };
}

/**
 * What the subscriber page registers with the Copilot: the open subscriber and the question about them, while the
 * subscriber loads and once it has, including after a failed refetch that keeps the loaded subscriber. No subscriber
 * when the fetch failed before any loaded, such as a deleted subscriber or a mistyped id. The page renders in the
 * subscriber drawer, so the Copilot always sits above it (`overSheet`).
 */
export function buildSubscriberPageView(
  subscriberId: string,
  { subscriber, isError }: { subscriber?: { firstName?: string | null; lastName?: string | null }; isError: boolean }
): CopilotPageView {
  if (isError && !subscriber) return { overSheet: true };

  return {
    viewing: buildSubscriberViewing(subscriberId, subscriber),
    question: SUBSCRIBER_REACHABILITY_QUESTION,
    overSheet: true,
  };
}
