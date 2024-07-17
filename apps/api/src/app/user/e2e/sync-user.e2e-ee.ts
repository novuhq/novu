/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ClerkClientMock } from '@novu/ee-auth';
import { User } from '@novu/shared';

// TODO: rework to clerk webhook
describe.skip('Sync Clerk user with internal database', async () => {
  let session: UserSession;
  let clerkClientMock: ClerkClientMock;
  let clerkUser: User;

  function getRequest(origin: string = process.env.FRONT_BASE_URL) {
    return session.testAgent.post('/v1/users/').set('origin', origin);
  }

  before(async () => {
    session = new UserSession();
    clerkClientMock = new ClerkClientMock();

    // must be an existing Clerk user
    clerkUser = await clerkClientMock.users.getUser('clerk_user_1');

    await session.updateEETokenClaims({
      _id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      lastName: clerkUser.lastName!,
      firstName: clerkUser.firstName!,
      profilePicture: clerkUser.imageUrl,
      externalId: clerkUser.externalId!,
    });
  });

  it('should create internal user with externalId of given existing Clerk user', async () => {
    const { body } = await getRequest().expect(201);

    const internalUser = body.data;
    const updatedClerkUser = await clerkClientMock.users.getUser(clerkUser.id);

    expect(internalUser._id).to.equal(updatedClerkUser.externalId);
    expect(internalUser.externalId).to.equal(updatedClerkUser.id);
  });

  it('should throw an error when internal user already exists for Clerk user', async () => {
    const { body } = await getRequest().expect(400);

    expect(body.message).to.equal(`Internal user with externalId: ${clerkUser.id} already exists`);
  });

  it('should throw an error when Clerk user does not exist', async () => {
    const id = 'not_existing_id';
    await session.updateEETokenClaims({
      _id: id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      lastName: clerkUser.lastName!,
      firstName: clerkUser.firstName!,
      profilePicture: clerkUser.imageUrl,
      externalId: clerkUser.externalId!,
    });

    const { body } = await getRequest().expect(400);

    expect(body.message).to.equal(`Clerk user with id: ${id} does not exist`);
  });

  it('should not allow API call from different origin than Novu frontend', async () => {
    const origin = 'https://external.com';
    const { body } = await getRequest(origin).expect(403);

    expect(body.message).to.equal('Forbidden');
  });
});
