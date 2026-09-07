import { expect } from 'chai';
import sinon from 'sinon';

// Stub the AWS SDK modules before importing the uploader so the stubbed versions are used
const s3ClientModule = require('@aws-sdk/client-s3');
const presignerModule = require('@aws-sdk/s3-request-presigner');

import { UploadedAttachment, uploadAttachmentsToS3 } from './attachment-uploader';

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
    delete env.INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR;
  });

  it('returns empty result for no attachments', async () => {
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, []);

    expect(result.uploaded).to.deep.equal([]);
    expect(result.failedCount).to.equal(0);
    expect(result.mode).to.equal('s3');
    sinon.assert.notCalled(s3SendStub);
  });

  it('reports mode=s3 when S3 is configured', async () => {
    const attachment = {
      filename: 'doc.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('hi'),
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.mode).to.equal('s3');
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
    const uploaded = result.uploaded[0] as UploadedAttachment;
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

  it('falls back to inline embed when S3 upload fails', async () => {
    s3SendStub.rejects(new Error('S3 connection refused'));

    const attachment = {
      filename: 'fail.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from('fake image data'),
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.mode).to.equal('inline');
    expect(result.uploaded).to.have.length(1);
    expect(result.failedCount).to.equal(0);
    expect((result.uploaded[0] as { filename: string }).filename).to.equal('fail.jpg');
  });

  it('counts S3 failure (no inline fallback) and keeps mode=s3 when INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR=true', async () => {
    env.INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR = 'true';
    s3SendStub.rejects(new Error('S3 connection refused'));

    const attachment = {
      filename: 'fail.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from('fake image data'),
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    // No inline fallback in strict mode — the failure must surface so index.ts can emit a 451.
    expect(result.mode).to.equal('s3');
    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
    // Transient S3 throw is retriable, so it may drive the 451.
    expect(result.retriableFailedCount).to.equal(1);
  });

  it('does NOT mark a no-content attachment as retriable in strict mode (avoids 451 loop)', async () => {
    env.INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR = 'true';

    // uploadSingle returns null without throwing — a structural failure that a sender retry can never fix.
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [{ filename: 'empty.txt', contentType: 'text/plain' }]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
    // Critical: structural drop is NOT retriable, so index.ts will not emit a 451 (no infinite redelivery).
    expect(result.retriableFailedCount).to.equal(0);
    sinon.assert.notCalled(s3SendStub);
  });

  it('still keeps successful S3 uploads while counting strict-mode failures', async () => {
    env.INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR = 'true';
    s3SendStub.onFirstCall().resolves({}).onSecondCall().rejects(new Error('network timeout'));

    const attachments = [
      { filename: 'ok.pdf', contentType: 'application/pdf', content: Buffer.from('good') },
      { filename: 'bad.jpg', contentType: 'image/jpeg', content: Buffer.from('bad') },
    ];

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, attachments);

    expect(result.mode).to.equal('s3');
    expect(result.uploaded).to.have.length(1);
    expect((result.uploaded[0] as UploadedAttachment).filename).to.equal('ok.pdf');
    expect(result.failedCount).to.equal(1);
    expect(result.retriableFailedCount).to.equal(1);
  });

  it('uploads successful attachments and inline-falls back for failing ones', async () => {
    s3SendStub.onFirstCall().resolves({}).onSecondCall().rejects(new Error('network timeout'));

    const attachments = [
      { filename: 'ok.pdf', contentType: 'application/pdf', content: Buffer.from('good') },
      { filename: 'bad.jpg', contentType: 'image/jpeg', content: Buffer.from('bad') },
    ];

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, attachments);

    expect(result.mode).to.equal('s3');
    expect(result.uploaded).to.have.length(2);
    expect(result.uploaded[0].filename).to.equal('ok.pdf');
    expect(result.uploaded[1].filename).to.equal('bad.jpg');
    expect(result.failedCount).to.equal(0);
  });

  it('drops attachment with no content', async () => {
    const attachment = { filename: 'empty.txt', contentType: 'text/plain' };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
    sinon.assert.notCalled(s3SendStub);
  });

  it('falls back to inline mode when S3_BUCKET_NAME is not set', async () => {
    delete env.S3_BUCKET_NAME;

    const attachment = { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('data') };
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.mode).to.equal('inline');
    expect(result.failedCount).to.equal(0);
    expect(result.uploaded).to.have.length(1);
    const inline = result.uploaded[0] as { filename: string; size: number; content?: { type: string; data: number[] } };
    expect(inline.filename).to.equal('doc.pdf');
    expect(inline.size).to.equal(4);
    expect(inline.content).to.deep.equal({ type: 'Buffer', data: [100, 97, 116, 97] });
    expect(inline).to.not.have.property('url');
    expect(inline).to.not.have.property('storagePath');
    sinon.assert.notCalled(s3SendStub);
    sinon.assert.notCalled(getSignedUrlStub);
  });

  it('handles serialized Buffer JSON content in inline fallback', async () => {
    delete env.S3_BUCKET_NAME;

    const data = [104, 105];
    const attachment = {
      filename: 'note.txt',
      contentType: 'text/plain',
      content: { type: 'Buffer', data },
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.mode).to.equal('inline');
    expect(result.uploaded).to.have.length(1);
    const inline = result.uploaded[0] as { content?: { type: string; data: number[] } };
    expect(inline.content).to.deep.equal({ type: 'Buffer', data });
  });

  it('drops oversized attachment in inline fallback and increments failedCount', async () => {
    delete env.S3_BUCKET_NAME;

    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    const undersized = Buffer.from('ok');
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [
      { filename: 'big.bin', contentType: 'application/octet-stream', content: oversized },
      { filename: 'small.txt', contentType: 'text/plain', content: undersized },
    ]);

    expect(result.mode).to.equal('inline');
    expect(result.failedCount).to.equal(1);
    expect(result.uploaded).to.have.length(1);
    expect((result.uploaded[0] as { filename: string }).filename).to.equal('small.txt');
  });

  it('enforces an aggregate serialized-payload budget across inline attachments', async () => {
    delete env.S3_BUCKET_NAME;

    /*
     * Each 4 MB buffer of 0xFF bytes serializes to ~16 MB ("255," per byte), so
     * the first fits within the 24 MB aggregate budget but the second blows it,
     * proving sub-cap attachments can no longer compound into an oversized job.
     */
    const fourMb = 4 * 1024 * 1024;
    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [
      { filename: 'a.bin', contentType: 'application/octet-stream', content: Buffer.alloc(fourMb, 0xff) },
      { filename: 'b.bin', contentType: 'application/octet-stream', content: Buffer.alloc(fourMb, 0xff) },
    ]);

    expect(result.mode).to.equal('inline');
    expect(result.uploaded).to.have.length(1);
    expect((result.uploaded[0] as { filename: string }).filename).to.equal('a.bin');
    expect(result.failedCount).to.equal(1);
  });

  it('drops attachment with no content in inline fallback without throwing', async () => {
    delete env.S3_BUCKET_NAME;

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [{ filename: 'empty.txt', contentType: 'text/plain' }]);

    expect(result.mode).to.equal('inline');
    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
  });

  it('assigns distinct storage keys to attachments with the same filename', async () => {
    const attachments = [
      { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('first') },
      { filename: 'doc.pdf', contentType: 'application/pdf', content: Buffer.from('second') },
    ];

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, attachments);

    expect(result.failedCount).to.equal(0);
    expect(result.uploaded).to.have.length(2);
    expect((result.uploaded[0] as UploadedAttachment).storagePath).to.not.equal(
      (result.uploaded[1] as UploadedAttachment).storagePath
    );
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

    expect((first.uploaded[0] as UploadedAttachment).storagePath).to.equal(
      (second.uploaded[0] as UploadedAttachment).storagePath
    );
  });

  it('drops attachment with unsupported content shape without throwing', async () => {
    const attachment = {
      filename: 'weird.bin',
      contentType: 'application/octet-stream',
      content: { unexpected: 'shape' } as unknown as Buffer,
    };

    const result = await uploadAttachmentsToS3(TEST_MESSAGE_ID, [attachment]);

    expect(result.uploaded).to.have.length(0);
    expect(result.failedCount).to.equal(1);
    sinon.assert.notCalled(s3SendStub);
  });
});
