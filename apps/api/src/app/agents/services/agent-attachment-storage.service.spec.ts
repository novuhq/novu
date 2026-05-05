import type { StorageService } from '@novu/application-generic';
import { expect } from 'chai';
import type { Attachment } from 'chat';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { AgentAttachmentStorage, READ_URL_TTL_SECONDS } from './agent-attachment-storage.service';

describe('AgentAttachmentStorage', () => {
  const mb = 1024 * 1024;
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

  function makeStorageService() {
    return {
      uploadFile: sinon.stub().resolves({}),
      getReadSignedUrl: sinon.stub().resolves('https://signed/read'),
      fileExists: sinon.stub(),
    } as unknown as StorageService;
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

  it('should keep uploaded attachment metadata when signing fails', async () => {
    const uploadFile = sinon.stub().resolves({});
    const getReadSignedUrl = sinon.stub().rejects(new Error('signing unavailable'));
    const storageService = {
      uploadFile,
      getReadSignedUrl,
      fileExists: sinon.stub(),
    } as unknown as StorageService;
    const logger = makeLogger();

    const service = new AgentAttachmentStorage(storageService, logger as any);

    const attachment: Attachment = {
      type: 'file',
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 10,
      fetchData: async () => Buffer.from('hello'),
    };

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(1);
    expect(result[0]).to.include({
      type: 'file',
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 10,
    });
    expect(result[0].storageKey).to.include('org1/env1/agents/conv1/msg1/0-doc.pdf');
    expect(result[0].url).to.equal(undefined);
    expect(uploadFile.calledOnce).to.equal(true);
    expect(getReadSignedUrl.calledOnce).to.equal(true);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('should process at most 15 inbound attachments and preserve original indexes', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const fetchDataStubs = Array.from({ length: 16 }, () => sinon.stub().resolves(Buffer.from('x')));
    const attachments = fetchDataStubs.map((fetchData, index) => ({
      type: 'file',
      name: `file-${index}.txt`,
      mimeType: 'text/plain',
      size: 1,
      fetchData,
    })) as Attachment[];

    const result = await service.storeInbound(attachments, ctx);

    expect(result).to.have.length(15);
    expect(storageService.uploadFile.callCount).to.equal(15);
    expect(fetchDataStubs[15].called).to.equal(false);
    expect(result[14].storageKey).to.include('org1/env1/agents/conv1/msg1/14-file-14.txt');
    expect(logger.warn.calledWithMatch({ attachmentCount: 16, cap: 15 })).to.equal(true);
  });

  it('should skip known-size attachments that would exceed the aggregate byte cap before fetch', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const fetchDataStubs = [
      sinon.stub().resolves(Buffer.from('a')),
      sinon.stub().resolves(Buffer.from('b')),
      sinon.stub().resolves(Buffer.from('c')),
    ];
    const attachments = fetchDataStubs.map((fetchData, index) => ({
      type: 'file',
      name: `known-${index}.txt`,
      mimeType: 'text/plain',
      size: 20 * mb,
      fetchData,
    })) as Attachment[];

    const result = await service.storeInbound(attachments, ctx);

    expect(result).to.have.length(2);
    expect(storageService.uploadFile.callCount).to.equal(2);
    expect(fetchDataStubs[2].called).to.equal(false);
    expect(logger.warn.calledWithMatch({ size: 20 * mb, aggregateCap: 50 * mb })).to.equal(true);
  });

  it('should upload whatsapp fetchData attachments without size metadata', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const fetchData = sinon.stub().resolves(Buffer.from('x'));
    const attachments = [{ type: 'file', name: 'unknown.bin', fetchData }] as Attachment[];

    const result = await service.storeInbound(attachments, { ...ctx, platform: AgentPlatformEnum.WHATSAPP });

    expect(result).to.have.length(1);
    expect(fetchData.calledOnce).to.equal(true);
    expect(storageService.uploadFile.calledOnce).to.equal(true);
    expect(result[0]).to.include({
      type: 'file',
      name: 'unknown.bin',
      size: 1,
      url: 'https://signed/read',
    });
    expect(result[0].mimeType).to.equal(undefined);
  });

  it('should skip non-whatsapp fetchData attachments without size metadata before downloading', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const fetchData = sinon.stub().resolves(Buffer.from('x'));
    const attachments = [{ type: 'file', name: 'unknown.bin', fetchData }] as Attachment[];

    const result = await service.storeInbound(attachments, { ...ctx, platform: AgentPlatformEnum.SLACK });

    expect(result).to.have.length(0);
    expect(fetchData.called).to.equal(false);
    expect(storageService.uploadFile.called).to.equal(false);
    expect(logger.warn.called).to.equal(true);
  });

  it('should skip blob attachments when trusted size metadata is missing', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const blob = new Blob([Buffer.from('x')]);
    const attachment = {
      type: 'file',
      name: 'blob.bin',
      data: blob,
    } as Attachment;

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(0);
    expect(storageService.uploadFile.called).to.equal(false);
    expect(logger.warn.called).to.equal(true);
  });

  it('should skip attachments that exceed aggregate cap after fetch when size metadata is inaccurate', async () => {
    const storageService = makeStorageService();
    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);
    const attachments = [
      {
        type: 'file',
        name: 'file-0.bin',
        size: 24 * mb,
        fetchData: async () => Buffer.alloc(24 * mb),
      },
      {
        type: 'file',
        name: 'file-1.bin',
        size: 25 * mb,
        fetchData: async () => Buffer.alloc(25 * mb),
      },
      {
        type: 'file',
        name: 'file-2.bin',
        size: 1,
        fetchData: async () => Buffer.alloc(2 * mb),
      },
    ] as Attachment[];

    const result = await service.storeInbound(attachments, ctx);

    expect(result).to.have.length(2);
    expect(storageService.uploadFile.callCount).to.equal(2);
    expect(logger.warn.calledWithMatch({ byteLength: 2 * mb, aggregateCap: 50 * mb })).to.equal(true);
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

  it('should skip attachment over post-fetch size limit when size metadata is inaccurate', async () => {
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
      size: 1,
      fetchData: async () => huge,
    };

    const result = await service.storeInbound([attachment], ctx);

    expect(result).to.have.length(0);
    expect(storageService.uploadFile.called).to.equal(false);
  });

  it('should skip whatsapp fetchData attachment without size metadata when fetched data exceeds size limit', async () => {
    const storageService = {
      uploadFile: sinon.stub(),
      getReadSignedUrl: sinon.stub(),
      fileExists: sinon.stub(),
    } as unknown as StorageService;

    const logger = makeLogger();
    const service = new AgentAttachmentStorage(storageService, logger as any);

    const attachment: Attachment = {
      type: 'file',
      fetchData: async () => Buffer.alloc(26 * 1024 * 1024),
    };

    const result = await service.storeInbound([attachment], { ...ctx, platform: AgentPlatformEnum.WHATSAPP });

    expect(result).to.have.length(0);
    expect(storageService.uploadFile.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
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
