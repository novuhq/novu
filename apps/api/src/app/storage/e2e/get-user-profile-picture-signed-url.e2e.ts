import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get User Profile Picture Signed Url - /storage/upload-url/profile (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return an S3 signed URL', async function () {
    const {
      body: { data },
    } = await session.testAgent.get('/v1/storage/upload-url/profile?extension=jpg');

    expect(data.path).to.contain('.jpg');
    expect(data.signedUrl).to.contain('.jpg');
    expect(data.signedUrl).to.contain(`${session.user._id}`);
  });
});
