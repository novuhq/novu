import { SubscriberResponseDto } from '@novu/api/models/components';
import { ISubscriberResponseDto } from '@novu/shared';

export const getSubscriberTitle = (subscriber: ISubscriberResponseDto | SubscriberResponseDto) => {
  const fullName = `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  return fullName || subscriber.email || subscriber.phone || subscriber.subscriberId;
};

/**
 * Provenance marker written to `Subscriber.data` for subscribers the platform
 * auto-creates from an inbound agent message (e.g. an open-access email agent).
 * Mirrors the backend constants `AGENT_PROVISION_DATA_KEYS.source` /
 * `AGENT_PLATFORM_PROVISION_SOURCE` — keep in lockstep with them.
 */
const AGENT_PROVISION_SOURCE_KEY = '__novu_source';
const AGENT_PLATFORM_PROVISION_SOURCE = 'agent-platform-provision';

/**
 * True when the subscriber was auto-created from an inbound agent message rather
 * than by the customer's API/dashboard. Drives the "Auto-created" badge so these
 * rows are recognizable (and their eventual disappearance after adoption is not
 * surprising).
 */
export const isAgentAutoProvisionedSubscriber = (
  subscriber: ISubscriberResponseDto | SubscriberResponseDto
): boolean => {
  const data = (subscriber as ISubscriberResponseDto).data;

  return Boolean(data && data[AGENT_PROVISION_SOURCE_KEY] === AGENT_PLATFORM_PROVISION_SOURCE);
};
