import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { randomBytes } from 'crypto';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Create Subscriber - /subscribers (POST) #novu-v2', () => {
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should create  the subscriber', async () => {
    const subscriberId = `test-subscriber-${`${randomBytes(4).toString('hex')}`}`;
    const payload = {
      subscriberId,
      firstName: 'First Name',
      lastName: 'Last Name',
      locale: 'en_US',
      timezone: 'America/New_York',
    };

    const res = await novuClient.subscribers.create(payload, payload.subscriberId);

    const updatedSubscriber = res.result;
  });
});
