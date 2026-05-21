import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { IInboundParseAttachment } from '../../dtos/inbound-parse-job.dto';
import { NonExistingFileError } from '../../services/storage/non-existing-file.error';
import { StorageService } from '../../services/storage/storage.service';
import { AttachmentRehydrator } from './attachment-rehydrator';

describe('AttachmentRehydrator', () => {
  let rehydrator: AttachmentRehydrator;
  let storageService: sinon.SinonStubbedInstance<StorageService>;
  let sandbox: sinon.SinonSandbox;

  const makeAttachment = (overrides: Partial<IInboundParseAttachment> = {}): IInboundParseAttachment => ({
    filename: 'test.pdf',
    contentType: 'application/pdf',
    size: 1024,
    url: 'https://s3.example.com/inbound-mail/2024-01-01/msg/uuid-test.pdf?sig=abc',
    storagePath: 'inbound-mail/2024-01-01/msg/uuid-test.pdf',
    ...overrides,
  });

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    storageService = sandbox.createStubInstance(StorageService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AttachmentRehydrator, { provide: StorageService, useValue: storageService }],
    }).compile();

    rehydrator = module.get<AttachmentRehydrator>(AttachmentRehydrator);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns an empty array when no attachments are provided', async () => {
    const result = await rehydrator.rehydrate(undefined);

    expect(result).to.deep.equal([]);
    sinon.assert.notCalled(storageService.getFile);
  });

  it('returns an empty array for an empty attachments array', async () => {
    const result = await rehydrator.rehydrate([]);

    expect(result).to.deep.equal([]);
    sinon.assert.notCalled(storageService.getFile);
  });

  it('downloads file from S3 and embeds legacy content alongside new metadata', async () => {
    const fileBytes = Buffer.from([37, 80, 68, 70]);
    storageService.getFile.resolves(fileBytes);

    const attachment = makeAttachment();
    const result = await rehydrator.rehydrate([attachment]);

    expect(result).to.have.length(1);
    const rehydrated = result[0];
    // New metadata preserved
    expect(rehydrated.filename).to.equal(attachment.filename);
    expect(rehydrated.contentType).to.equal(attachment.contentType);
    expect(rehydrated.size).to.equal(attachment.size);
    expect(rehydrated.url).to.equal(attachment.url);
    expect(rehydrated.storagePath).to.equal(attachment.storagePath);
    // Legacy content embedded
    expect(rehydrated.content).to.deep.equal({ type: 'Buffer', data: [37, 80, 68, 70] });
    expect(rehydrated.contentBytes).to.equal(attachment.size);
    sinon.assert.calledOnceWithExactly(storageService.getFile, attachment.storagePath);
  });

  it('sets content to null when the file does not exist in S3 (NonExistingFileError)', async () => {
    storageService.getFile.rejects(new NonExistingFileError());

    const attachment = makeAttachment();
    const result = await rehydrator.rehydrate([attachment]);

    expect(result).to.have.length(1);
    expect(result[0].content).to.be.null;
    // url and other metadata still present
    expect(result[0].url).to.equal(attachment.url);
    expect(result[0].size).to.equal(attachment.size);
  });

  it('sets content to null on unexpected S3 error', async () => {
    storageService.getFile.rejects(new Error('S3 connection refused'));

    const attachment = makeAttachment();
    const result = await rehydrator.rehydrate([attachment]);

    expect(result).to.have.length(1);
    expect(result[0].content).to.be.null;
    expect(result[0].url).to.equal(attachment.url);
  });

  it('rehydrates multiple attachments in parallel', async () => {
    const bytes1 = Buffer.from([1, 2, 3]);
    const bytes2 = Buffer.from([4, 5, 6]);
    storageService.getFile.onFirstCall().resolves(bytes1).onSecondCall().resolves(bytes2);

    const attachments = [makeAttachment({ filename: 'a.pdf' }), makeAttachment({ filename: 'b.pdf' })];
    const result = await rehydrator.rehydrate(attachments);

    expect(result).to.have.length(2);
    expect(result[0].content!.data).to.deep.equal([1, 2, 3]);
    expect(result[1].content!.data).to.deep.equal([4, 5, 6]);
    sinon.assert.calledTwice(storageService.getFile);
  });

  it('continues with null content for failing attachment and succeeds for others', async () => {
    const bytes = Buffer.from([7, 8, 9]);
    storageService.getFile.onFirstCall().rejects(new NonExistingFileError()).onSecondCall().resolves(bytes);

    const attachments = [makeAttachment({ filename: 'missing.pdf' }), makeAttachment({ filename: 'found.pdf' })];
    const result = await rehydrator.rehydrate(attachments);

    expect(result).to.have.length(2);
    expect(result[0].content).to.be.null;
    expect(result[1].content!.data).to.deep.equal([7, 8, 9]);
  });
});
