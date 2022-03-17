import { UserSession } from '@notifire/testing';
import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';

describe.only('Initialize Session - /widgets/session/initialize (POST)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a valid app session for current widget user', async function () {
    const { body } = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.application.identifier,
        $user_id: '12345',
        $first_name: 'Test',
        $last_name: 'User',
        $email: 'test@example.com',
        $phone: '054777777',
      })
      .expect(201);

    expect(body.data.token).to.be.ok;
    expect(body.data.profile._id).to.be.ok;
    expect(body.data.profile.firstName).to.equal('Test');
    expect(body.data.profile.phone).to.equal('054777777');
    expect(body.data.profile.lastName).to.equal('User');
  });

  it('should throw an error when an invalid application Id passed', async function () {
    const { body } = await session.testAgent.post('/v1/widgets/session/initialize').send({
      applicationIdentifier: 'some-not-existing-id',
      $user_id: '12345',
      $first_name: 'Test',
      $last_name: 'User',
      $email: 'test@example.com',
      $phone: '054777777',
    });

    expect(body.message).to.contain('Please provide a valid app identifier');
  });
});
