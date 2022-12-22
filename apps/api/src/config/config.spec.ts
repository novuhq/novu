import { UserSession } from '@novu/testing';

describe('Environment - Feature Flags', () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });
});
