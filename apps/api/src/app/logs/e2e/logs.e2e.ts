import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe.skip('Observability - /observability/logs/http-requests (GET) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return a list of http logs', async () => {
    const { body } = await session.testAgent.get('/v1/logs/requests').expect(200);

    expect(body.data).to.be.an('array');
    expect(body.total).to.be.a('number');
    expect(body.pageSize).to.be.a('number');
  });
});
