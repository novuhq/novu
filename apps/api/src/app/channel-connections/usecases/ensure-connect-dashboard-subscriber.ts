import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateOrUpdateSubscriberCommand, CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { CONNECT_SUBSCRIBER_PREFIX } from '@novu/shared';

interface EnsureConnectDashboardSubscriberParams {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  subscriberRepository: SubscriberRepository;
  createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase;
}

/**
 * Ensures the subscriber exists before creating a channel connection or
 * starting OAuth. Dashboard Connect flows pass `connect:<userId>` ids that
 * may not be provisioned yet — auto-create those on demand. All other
 * subscriber ids must already exist.
 */
export async function ensureConnectDashboardSubscriber({
  subscriberId,
  environmentId,
  organizationId,
  subscriberRepository,
  createOrUpdateSubscriber,
}: EnsureConnectDashboardSubscriberParams): Promise<void> {
  const existingSubscriber = await subscriberRepository.findBySubscriberId(environmentId, subscriberId);

  if (existingSubscriber) {
    return;
  }

  const isConnectDashboardSubscriber = subscriberId.startsWith(`${CONNECT_SUBSCRIBER_PREFIX}:`);

  if (!isConnectDashboardSubscriber) {
    throw new NotFoundException(`Subscriber not found: ${subscriberId}`);
  }

  const created = await createOrUpdateSubscriber.execute(
    CreateOrUpdateSubscriberCommand.create({
      environmentId,
      organizationId,
      subscriberId,
      allowUpdate: false,
    })
  );

  if (!created) {
    throw new UnprocessableEntityException(`Failed to provision subscriber: ${subscriberId}`);
  }
}
