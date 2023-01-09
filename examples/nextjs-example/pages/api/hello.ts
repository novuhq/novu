import type { NextApiRequest, NextApiResponse } from 'next';
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY ?? '<YOUR_API_KEY>');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const triggerId = process.env.NOVU_TEST_TRIGGER_ID ?? '<YOUR_TRIGGER_ID>';
  const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '<YOUR_SUBSCRIBER_ID>';

  try {
    await novu.subscribers.get(subscriberId);
  } catch (e) {
    await novu.subscribers.identify(subscriberId, {
      email: 'john@doemail.com',
      firstName: 'John',
      lastName: 'Doe',
    });
  }

  await novu.trigger(triggerId, {
    to: { subscriberId },
    payload: {},
  });

  res.status(204).json({ message: `Triggered notification` });
}
