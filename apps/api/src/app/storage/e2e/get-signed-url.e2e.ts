import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get Signed Url - /storage/upload-url (GET) #novu-v0', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return an S3 signed URL', async () => {
    const {
      body: { data },
    } = await session.testAgent.get('/v1/storage/upload-url?extension=jpg');

    expect(data.path).to.contain('.jpg');
    expect(data.signedUrl).to.contain('.jpg');
    expect(data.signedUrl).to.contain(`${session.organization._id}/${session.environment._id}`);
  });

  it('should return a signed URL under the email-assets prefix for the EMAIL_ASSET type', async () => {
    const {
      body: { data },
    } = await session.testAgent.get('/v1/storage/upload-url?extension=png&type=EMAIL_ASSET');

    expect(data.path).to.contain('.png');
    expect(data.signedUrl).to.contain(`${session.organization._id}/${session.environment._id}/email-assets/`);
  });

  it('should accept gif and webp extensions', async () => {
    for (const extension of ['gif', 'webp']) {
      const {
        body: { data },
      } = await session.testAgent.get(`/v1/storage/upload-url?extension=${extension}&type=EMAIL_ASSET`);

      expect(data.path).to.contain(`.${extension}`);
      expect(data.signedUrl).to.contain(`.${extension}`);
    }
  });

  it('should reject an svg extension', async () => {
    const { status } = await session.testAgent.get('/v1/storage/upload-url?extension=svg&type=EMAIL_ASSET');

    expect(status).to.equal(422);
  });
});
