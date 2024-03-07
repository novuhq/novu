import { EnvironmentRepository, OrganizationRepository, UserEntity, UserRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update user name and profile picture - /users/profile (PUT)', async () => {
  let session: UserSession;

  const environmentRepository = new EnvironmentRepository();
  const organizationRepository = new OrganizationRepository();
  const userRepository = new UserRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the user name and profile picture', async () => {
    const { statusCode } = await session.testAgent.put('/v1/users/profile').send({
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/profile-picture.jpg',
    });

    expect(statusCode).to.equal(204);

    const user = (await userRepository.findOne({ _id: session.user._id })) as UserEntity;
    expect(user.firstName).to.equal('John');
    expect(user.lastName).to.equal('Doe');
    expect(user.profilePicture).to.equal('https://example.com/profile-picture.jpg');
  });

  it('should update the user name', async () => {
    const { statusCode } = await session.testAgent.put('/v1/users/profile').send({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(statusCode).to.equal(204);

    const user = (await userRepository.findOne({ _id: session.user._id })) as UserEntity;
    expect(user.firstName).to.equal('John');
    expect(user.lastName).to.equal('Doe');
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

  it('should remove the profile picture when imageUrl is not provided', async () => {
    const { statusCode } = await session.testAgent.put('/v1/users/profile').send({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(statusCode).to.equal(204);

    const user = (await userRepository.findOne({ _id: session.user._id })) as UserEntity;
    expect(user.firstName).to.equal('John');
    expect(user.lastName).to.equal('Doe');
    expect(user.profilePicture).to.not.exist;
  });
});
