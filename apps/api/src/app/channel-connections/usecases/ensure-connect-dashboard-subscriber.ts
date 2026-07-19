import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateOrUpdateSubscriberCommand, CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';

interface SubscriberLookupParams {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  subscriberRepository: SubscriberRepository;
  createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase;
}

/**
 * Throws when the subscriber does not exist. Used by channel-connection create
 * so API callers cannot bind credentials to a missing subscriber id.
 */
export async function assertSubscriberExists({
  subscriberId,
  environmentId,
  subscriberRepository,
}: Pick<SubscriberLookupParams, 'subscriberId' | 'environmentId' | 'subscriberRepository'>): Promise<void> {
  const existingSubscriber = await subscriberRepository.findBySubscriberId(environmentId, subscriberId);

  if (!existingSubscriber) {
    throw new NotFoundException(`Subscriber not found: ${subscriberId}`);
  }
}

/**
 * Provisions a missing subscriber for dashboard OAuth URL generation, where the
 * logged-in user's id is used as subscriberId (same as workflow testing) and
 * may not exist yet.
 */
export async function ensureSubscriberProvisioned({
  subscriberId,
  environmentId,
  organizationId,
  subscriberRepository,
  createOrUpdateSubscriber,
}: SubscriberLookupParams): Promise<void> {
  const existingSubscriber = await subscriberRepository.findBySubscriberId(environmentId, subscriberId);

  if (existingSubscriber) {
    return;
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
