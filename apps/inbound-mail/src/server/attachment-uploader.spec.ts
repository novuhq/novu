import { expect } from 'chai';
import sinon from 'sinon';

// Stub the AWS SDK modules before importing the uploader so the stubbed versions are used
const s3ClientModule = require('@aws-sdk/client-s3');
const presignerModule = require('@aws-sdk/s3-request-presigner');

import { uploadAttachmentsToS3 } from './attachment-uploader';

const env = process.env as Record<string, string | undefined>;

describe('uploadAttachmentsToS3', () => {
  let sandbox: sinon.SinonSandbox;
  let s3SendStub: sinon.SinonStub;
  let getSignedUrlStub: sinon.SinonStub;

  const TEST_BUCKET = 'test-bucket';
  const TEST_MESSAGE_ID = 'test-message-id@example.com';
  const PRESIGNED_URL =
    'https://test-bucket.s3.amazonaws.com/inbound-mail/2024-01-01/test/uuid-test.pdf?X-Amz-Signature=abc';

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    s3SendStub = sandbox.stub().resolves({});
    sandbox.stub(s3ClientModule, 'S3Client').returns({ send: s3SendStub });

    getSignedUrlStub = sandbox.stub(presignerModule, 'getSignedUrl').resolves(PRESIGNED_URL);

    env.S3_BUCKET_NAME = TEST_BUCKET;
    env.S3_REGION = 'us-east-1';
    delete env.INBOUND_ATTACHMENT_URL_TTL_SECONDS;
  });

  afterEach(() => {
    sandbox.restore();
    delete env.S3_BUCKET_NAME;
    delete env.S3_REGION;
  });

  it('returns empty result for no attachments', async () => {
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, []);

    expect(result.uploaded).to.deep.equal([]);
    expect(result.failedCount).to.equal(0);
    sinon.assert.notCalled(s3SendStub);
  });

  it('uploads a Buffer attachment and returns metadata with presigned URL', async () => {
    const content = Buffer.from('hello pdf');
    const attachment = {
      filename: 'doc.pdf',
      contentType: 'application/pdf',
      content,
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.failedCount).to.equal(0);
    expect(result.uploaded).to.have.length(1);
    const uploaded = result.uploaded[0];
    expect(uploaded.filename).to.equal('doc.pdf');
    expect(uploaded.contentType).to.equal('application/pdf');
    expect(uploaded.size).to.equal(content.byteLength);
    expect(uploaded.url).to.equal(PRESIGNED_URL);
    expect(uploaded.storagePath).to.be.a('string').and.include('inbound-mail/');
    sinon.assert.calledOnce(s3SendStub);
    sinon.assert.calledOnce(getSignedUrlStub);
  });

  it('handles Buffer JSON shaped attachment (mailparser legacy format)', async () => {
    const data = [104, 101, 108, 108, 111];
    const attachment = {
      filename: 'note.txt',
      contentType: 'text/plain',
      content: { type: 'Buffer', data },
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.failedCount).to.equal(0);
    expect(result.uploaded).to.have.length(1);
    expect(result.uploaded[0].size).to.equal(data.length);
    sinon.assert.calledOnce(s3SendStub);
  });

  it('drops an attachment on S3 upload failure and increments failedCount', async () => {
    s3SendStub.rejects(new Error('S3 connection refused'));

    const attachment = {
      filename: 'fail.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from('fake image data'),
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
  });

  it('uploads successful attachments and counts individually failing ones', async () => {
    s3SendStub.onFirstCall().resolves({}).onSecondCall().rejects(new Error('network timeout'));

    const attachments = [
      { filename: 'ok.pdf', contentType: 'application/pdf', content: Buffer.from('good') },
      { filename: 'bad.jpg', contentType: 'image/jpeg', content: Buffer.from('bad') },
    ];

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, attachments);

    expect(result.uploaded).to.have.length(1);
    expect(result.uploaded[0].filename).to.equal('ok.pdf');
    expect(result.failedCount).to.equal(1);
  });

  it('drops attachment with no content', async () => {
    const attachment = { filename: 'empty.txt', contentType: 'text/plain' };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(0);
    sinon.assert.notCalled(s3SendStub);
  });

  it('returns empty result when S3_BUCKET_NAME is not set', async () => {
    delete env.S3_BUCKET_NAME;

    const attachment = { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('data') };
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.deep.equal([]);
    expect(result.failedCount).to.equal(0);
    sinon.assert.notCalled(s3SendStub);
  });

  it('assigns distinct storage keys to attachments with the same filename', async () => {
    const attachments = [
      { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('first') },
      { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('second') },
    ];

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, attachments);

    expect(result.failedCount).to.equal(0);
    expect(result.uploaded).to.have.length(2);
    expect(result.uploaded[0].storagePath).to.not.equal(result.uploaded[1].storagePath);
  });

  it('caps presigned URL TTL at 7 days maximum', async () => {
    env.INBOUND_ATTACHMENT_URL_TTL_SECONDS = String(99999999);

    const attachment = { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('data') };
    await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    const signedUrlCall = getSignedUrlStub.getCall(0);
    expect(signedUrlCall.args[2].expiresIn).to.equal(604800);
  });

  it('uses custom TTL when within 7-day limit', async () => {
    const customTtl = 3600;
    env.INBOUND_ATTACHMENT_URL_TTL_SECONDS = String(customTtl);

    const attachment = { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('data') };
    await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    const signedUrlCall = getSignedUrlStub.getCall(0);
    expect(signedUrlCall.args[2].expiresIn).to.equal(customTtl);
  });

  it('produces deterministic storage keys across retries for the same messageId and filename', async () => {
    const attachment = { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('data') };

    const first = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);
    const second = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(first.uploaded[0].storagePath).to.equal(second.uploaded[0].storagePath);
  });

  it('drops attachment with unsupported content shape without throwing', async () => {
    const attachment = {
      filename: 'weird.bin',
      contentType: 'application/octet-stream',
      content: { unexpected: 'shape' } as unknown as Buffer,
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(0);
    sinon.assert.notCalled(s3SendStub);
  });
});
