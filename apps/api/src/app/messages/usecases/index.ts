import { GetSubscriber } from '../../subscribers/usecases/get-subscriber';
import { GetMessages } from './get-messages';
import { RemoveMessage } from './remove-message';

export const USE_CASES = [RemoveMessage, GetMessages, GetSubscriber];
