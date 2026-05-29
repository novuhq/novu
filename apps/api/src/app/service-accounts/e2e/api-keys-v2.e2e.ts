import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('API Keys v2 (e2e) @skip-if-os=macos', () => {
  let session: UserSession;

  beforeEach(async () => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).IS_API_KEYS_V2_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
  });

  it('should create a service account and prefixed API key', async () => {
    const { body: serviceAccount } = await session.testAgent
      .post('/v1/service-accounts')
      .send({
        name: 'E2E Test Bot',
        scope: 'environment',
        environmentId: session.environment._id,
      })
      .expect(201);

    expect(serviceAccount._id).to.be.ok;
    expect(serviceAccount.name).to.equal('E2E Test Bot');

    const { body: apiKey } = await session.testAgent
      .post(`/v1/service-accounts/${serviceAccount._id}/keys`)
      .send({ name: 'E2E Key' })
      .expect(201);

    expect(apiKey.key).to.match(/^nv_sk_/);
    expect(apiKey.last4).to.be.a('string').and.have.length(4);
  });

  it('should seed signing secrets on enable-v2 opt-in', async () => {
    const { body } = await session.testAgent.post('/v1/signing-secrets/enable-v2').expect(201);

    expect(body.seeded).to.equal(true);

    const { body: secrets } = await session.testAgent.get('/v1/signing-secrets').expect(200);

    expect(secrets.length).to.be.greaterThan(0);
  });
});
