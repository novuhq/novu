import { Subscriber } from '../../types';

export function buildSubscriber({
  subscriberId,
  subscriber,
}: {
  subscriberId: string | undefined;
  subscriber: Subscriber | string | undefined;
}): Subscriber {
  // subscriber object
  if (subscriber) {
    return typeof subscriber === 'string' ? { subscriberId: subscriber } : subscriber;
  }

  // subscriberId
  if (subscriberId) {
    return { subscriberId: subscriberId as string };
  }

  // missing - keyless subscriber, the api will generate a subscriberId
  return { subscriberId: '' };
}
