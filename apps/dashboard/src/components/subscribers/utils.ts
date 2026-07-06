import { SubscriberResponseDto } from '@novu/api/models/components';
import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS, ISubscriberResponseDto } from '@novu/shared';

export const getSubscriberTitle = (subscriber: ISubscriberResponseDto | SubscriberResponseDto) => {
  const fullName = `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  return fullName || subscriber.email || subscriber.phone || subscriber.subscriberId;
};

/**
 * True when the subscriber was auto-created from an inbound agent message rather
 * than by the customer's API/dashboard (identified by the agent-platform
 * provenance marker on `Subscriber.data`). Drives the "Auto-created" badge so
 * these rows are recognizable (and their eventual disappearance after adoption
 * is not surprising).
 */
export const isAgentAutoProvisionedSubscriber = (subscriber: { data?: Record<string, unknown> | null }): boolean => {
  return subscriber.data?.[AGENT_PROVISION_DATA_KEYS.source] === AGENT_PLATFORM_PROVISION_SOURCE;
};
