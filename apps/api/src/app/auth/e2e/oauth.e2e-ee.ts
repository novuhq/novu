import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('User login - /auth/google (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should redirect to google oauth', async () => {
    const res = await session.testAgent.get('/v1/auth/google').send();

    expect(res.statusCode).to.equal(302);
    expect(res.headers.location).to.contain('accounts.google.com/o/oauth2/v2/auth');
  });
});
