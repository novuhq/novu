import type { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';

type Repositories = {
  humanContactRepository: Pick<HumanContactRepository, 'findVerifiedAddress'>;
  subscriberRepository: Pick<SubscriberRepository, 'update'>;
};

type ContactScope = { environmentId: string; agentId: string; subscriberId: string };

/**
 * Copies the address that is verified right now onto the subscriber. A late writer re-reads and follows a newer
 * verification instead of leaving Subscriber.email pointing at the address it just replaced. `fallbackAddress`
 * goes on the subscriber when nothing reads as verified.
 */
export async function syncSubscriberEmail(
  { humanContactRepository, subscriberRepository }: Repositories,
  { environmentId, agentId, subscriberId }: ContactScope,
  fallbackAddress?: string
): Promise<void> {
  let written: string | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await humanContactRepository.findVerifiedAddress(
      environmentId,
      agentId,
      subscriberId,
      HumanChannelViaEnum.EMAIL
    );
    const next = current?.address ?? (written ? undefined : fallbackAddress);
    if (!next || next === written) {
      return;
    }

    await subscriberRepository.update({ subscriberId, _environmentId: environmentId }, { $set: { email: next } });
    written = next;
  }
}
