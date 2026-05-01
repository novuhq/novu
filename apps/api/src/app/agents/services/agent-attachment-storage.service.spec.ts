import type { StorageService } from '@novu/application-generic';
import { expect } from 'chai';
import type { Attachment } from 'chat';
import sinon from 'sinon';
import { AgentAttachmentStorage, READ_URL_TTL_SECONDS } from './agent-attachment-storage.service';

describe('AgentAttachmentStorage', () => {
  const ctx = {
    organizationId: 'org1',
    environmentId: 'env1',
    conversationId: 'conv1',
    platformMessageId: 'msg1',
  };

  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  it('should upload and return signed url for fetchData attachment', async () => {
    const uploadFile = sinon.stub().resolves({});
    const getReadSignedUrl = sinon.stub().resolves('https://signed/read');
    const storageService = {
      uploadFile,
      getReadSignedUrl,
      fileExists: sinon.stub(),
    } as unknown as StorageService;

    const service = new AgentAttachmentStorage(storageService, makeLogger() as any);

    const attachment: Attachment = {
      type: 'file',
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 10,
      fetchData: async () => Buffer.from('hello'),
    };

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(1);
    expect(result[0].url).to.equal('https://signed/read');
    expect(result[0].storageKey).to.include('org1/env1/agents/conv1/msg1/0-doc.pdf');
    expect(uploadFile.calledOnce).to.equal(true);
    expect(getReadSignedUrl.calledOnce).to.equal(true);
    expect(getReadSignedUrl.firstCall.args[1]).to.equal(READ_URL_TTL_SECONDS);
  });

  it('should skip attachment over pre-fetch size limit', async () => {
    const storageService = {
      uploadFile: sinon.stub(),
      getReadSignedUrl: sinon.stub(),
      fileExists: sinon.stub(),
    } as unknown as StorageService;

    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);

    const attachment: Attachment = {
      type: 'file',
      size: 26 * 1024 * 1024,
      fetchData: async () => Buffer.from('x'),
    };

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(0);
    expect(storageService.uploadFile.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('should skip attachment over post-fetch size limit when size metadata absent', async () => {
    const storageService = {
      uploadFile: sinon.stub(),
      getReadSignedUrl: sinon.stub(),
      fileExists: sinon.stub(),
    } as unknown as StorageService;

    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);

    const huge = Buffer.alloc(26 * 1024 * 1024);
    const attachment: Attachment = {
      type: 'file',
      fetchData: async () => huge,
    };

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(0);
    expect(storageService.uploadFile.called).to.equal(false);
  });

  it('should signRead when object exists', async () => {
    const storageService = {
      fileExists: sinon.stub().resolves(true),
      getReadSignedUrl: sinon.stub().resolves('https://read'),
    } as unknown as StorageService;

    const service = new AgentAttachmentStorage(storageService, makeLogger() as any);
    const url = await service.signRead('org/env/agents/conv/msg/0-f.txt');

    expect(url).to.equal('https://read');
    expect(storageService.fileExists.calledOnce).to.equal(true);
  });

  it('should return null from signRead when object missing', async () => {
    const storageService = {
      fileExists: sinon.stub().resolves(false),
      getReadSignedUrl: sinon.stub(),
    } as unknown as StorageService;

    const service = new AgentAttachmentStorage(storageService, makeLogger() as any);
    const url = await service.signRead('missing-key');

    expect(url).to.equal(null);
    expect(storageService.getReadSignedUrl.called).to.equal(false);
  });
});
