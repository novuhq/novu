import { type CopilotViewing, CopilotViewingResourceEnum } from '@novu/shared';

/** The question about the subscriber open in the drawer; it leads the Copilot's suggestions. */
export const SUBSCRIBER_REACHABILITY_QUESTION = 'Can this subscriber be reached on every channel?';

/**
 * What the subscriber drawer shows: the open subscriber, labelled with their name once loaded and their id before.
 * Never their email or phone number: the agent looks the subscriber up by id.
 */
export function buildSubscriberViewing(
  subscriberId: string,
  subscriber?: { firstName?: string | null; lastName?: string | null }
): CopilotViewing {
  const name = [subscriber?.firstName, subscriber?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return {
    resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: subscriberId, label: name || subscriberId },
  };
}
