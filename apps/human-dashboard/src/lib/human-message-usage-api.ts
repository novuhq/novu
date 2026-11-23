import 'server-only';

import { cache } from 'react';

import type { HumanAccount } from './human-account';
import { requestForAccount } from './human-api-key';
import type { MessageUsage } from './message-usage';

/**
 * How many messages the account's agents sent today and this month, out of how many they may. `null` when it can't
 * be read just now: the page then leaves the meter and the banner out rather than guess.
 */
export const loadMessageUsage = cache(async (account: HumanAccount): Promise<MessageUsage | null> => {
  try {
    return await requestForAccount<MessageUsage>(account, '/v1/human/message-usage');
  } catch (error) {
    console.error('Failed to load the message usage', error);

    return null;
  }
});
