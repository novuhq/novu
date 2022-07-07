import { CreateSubscriber } from './create-subscriber';
import { UpdateSubscriber } from './update-subscriber';
import { RemoveSubscriber } from './remove-subscriber';
import { GetSubscribers } from './get-subscribers';
import { UpdateSubscriberChannel } from './update-subscriber-channel';

export const USE_CASES = [
  CreateSubscriber,
  UpdateSubscriber,
  RemoveSubscriber,
  GetSubscribers,
  UpdateSubscriberChannel,
];
