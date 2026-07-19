import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateOrUpdateSubscriberCommand, CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';

interface EnsureConnectDashboardSubscriberParams {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  subscriberRepository: SubscriberRepository;
  createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase;
  /**
   * When true, provision a missing subscriber (dashboard OAuth URL generation).
   * When false, missing subscribers raise NotFoundException (channel-connection API).
   */
  allowProvision?: boolean;
}

/**
 * Ensures the subscriber exists before creating a channel connection or
 * starting OAuth. Dashboard Connect flows pass the logged-in user's id as
 * `subscriberId` (same as workflow testing); OAuth URL generation may
 * auto-create that row when `allowProvision` is set.
 */
export async function ensureConnectDashboardSubscriber({
  subscriberId,
  environmentId,
  organizationId,
  subscriberRepository,
  createOrUpdateSubscriber,
  allowProvision = false,
}: EnsureConnectDashboardSubscriberParams): Promise<void> {
  const existingSubscriber = await subscriberRepository.findBySubscriberId(environmentId, subscriberId);

  if (existingSubscriber) {
    return;
  }

  if (!allowProvision) {
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
