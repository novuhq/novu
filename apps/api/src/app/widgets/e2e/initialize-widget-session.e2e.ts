import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { EnvironmentRepository } from '@novu/dal';
import { createHmac } from 'crypto';

describe('Initialize Session - /widgets/session/initialize (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a valid app session for current widget user', async function () {
    const { body } = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId: '12345',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '054777777',
      })
      .expect(201);

    expect(body.data.token).to.be.ok;
    expect(body.data.profile._id).to.be.ok;
    expect(body.data.profile.firstName).to.equal('Test');
    expect(body.data.profile.phone).to.equal('054777777');
    expect(body.data.profile.lastName).to.equal('User');
  });

  it('should throw an error when an invalid environment Id passed', async function () {
    const { body } = await session.testAgent.post('/v1/widgets/session/initialize').send({
      applicationIdentifier: 'some-not-existing-id',
      subscriberId: '12345',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '054777777',
    });

    expect(body.message).to.contain('Please provide a valid app identifier');
  });

  it('should pass the test with valid HMAC hash', async function () {
    const subscriberId = '12345';
    const secretKey = session.environment.apiKeys[0].key;

    await enableWidgetSecurityEncryption(environmentRepository, session);

    const hmacHash = createHmac('sha256', secretKey).update(subscriberId).digest('hex');
    const response = await initWidgetSession(subscriberId, session, hmacHash);

    expect(response.status).to.equal(201);
  });

  it('should fail the test with invalid subscriber id or invalid secret key', async function () {
    const validSubscriberId = '12345';
    const validSecretKey = session.environment.apiKeys[0].key;
    let hmacHash;

    await enableWidgetSecurityEncryption(environmentRepository, session);

    const invalidSubscriberId = validSubscriberId + '0';
    hmacHash = createHmac('sha256', validSecretKey).update(invalidSubscriberId).digest('hex');
    const responseInvalidSubscriberId = await initWidgetSession(validSubscriberId, session, hmacHash);

    const invalidSecretKey = validSecretKey + '0';
    hmacHash = createHmac('sha256', invalidSecretKey).update(validSubscriberId).digest('hex');
    const responseInvalidSecretKey = await initWidgetSession(validSubscriberId, session, hmacHash);

    expect(responseInvalidSubscriberId.body.message).to.contain('Please provide a valid HMAC hash');
    expect(responseInvalidSecretKey.body.message).to.contain('Please provide a valid HMAC hash');
  });
});

async function enableWidgetSecurityEncryption(environmentRepository, session) {
  await environmentRepository.update(
    {
      _organizationId: session.organization._id,
      _id: session.environment._id,
    },
    { $set: { widget: { notificationCenterEncryption: true } } }
  );
}

async function initWidgetSession(subscriberId: string, session, hmacHash?: string) {
  return await session.testAgent.post('/v1/widgets/session/initialize').send({
    applicationIdentifier: session.environment.identifier,
    subscriberId: subscriberId,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '054777777',
    hmacHash: hmacHash,
  });
}
