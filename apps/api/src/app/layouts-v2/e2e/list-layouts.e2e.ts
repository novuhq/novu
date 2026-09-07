import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('List Layouts - /v2/layouts (GET) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should reject limit values above 100', async () => {
    const { body } = await session.testAgent.get('/v2/layouts').query({ limit: 101 });

    expect(body.statusCode).to.equal(422);
    expect(body.message).to.equal('Validation Error');
    expect(body.errors.general.messages).to.include('limit must not be greater than 100');
  });
});
