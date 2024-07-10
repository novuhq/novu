import { processTestAgentExpectedStatusCode, UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update user name and profile picture - /users/profile (PUT)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the user name and profile picture', async () => {
    const profilePicture = 'https://example.com/profile-picture.jpg';
    const {
      body: { data },
    } = await session.testAgent
      .put('/v1/users/profile')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: profilePicture,
      })
      .expect(processTestAgentExpectedStatusCode(200));

    expect(data.firstName).to.equal('John');
    expect(data.lastName).to.equal('Doe');
    expect(data.profilePicture).to.equal(profilePicture);
  });

  it('should update the user name', async () => {
    const {
      body: { data },
      statusCode,
    } = await session.testAgent.put('/v1/users/profile').send({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(statusCode).to.equal(200);
    expect(data.firstName).to.equal('John');
    expect(data.lastName).to.equal('Doe');
  });

  it('should throw when invalid first name or last name provided', async () => {
    const { body } = await session.testAgent.put('/v1/users/profile').send({
      firstName: '',
      lastName: 'Doe',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal('First name and last name are required');

    const { body: body2 } = await session.testAgent.put('/v1/users/profile').send({
      firstName: 'John',
      lastName: '',
    });

    expect(body2.statusCode).to.equal(400);
    expect(body2.message).to.equal('First name and last name are required');
  });
});
