import type { IncomingHttpHeaders } from 'node:http';
import { BadRequestException } from '@nestjs/common';
import { MailFactory } from '@novu/application-generic';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatSdkService } from './chat-sdk.service';

function makePinnedResponse({
  status = 200,
  statusText = 'OK',
  headers = {},
  data = Buffer.from('hello'),
}: {
  status?: number;
  statusText?: string;
  headers?: IncomingHttpHeaders;
  data?: Buffer;
} = {}) {
  return { status, statusText, headers, data };
}

describe('ChatSdkService', () => {
  function makeService() {
    const logger = {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };

    return new ChatSdkService(
      logger as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { create: sinon.stub().resolves({ _id: 'm' }) } as any
    );
  }

  describe('prepareContentForDelivery', () => {
    it('should materialize files for card replies on supported platforms', async () => {
      const service = makeService();
      const result = await (service as any).prepareContentForDelivery(
        {
          card: { type: 'card', title: 'Report', children: [] },
          files: [
            {
              filename: 'sample.jpg',
              mimeType: 'image/jpeg',
              data: Buffer.from('hello').toString('base64'),
            },
          ],
        },
        'whatsapp'
      );

      expect(result.card).to.exist;
      expect(Buffer.isBuffer(result.files[0].data)).to.equal(true);
      expect(result.files[0].filename).to.equal('sample.jpg');
    });

    it('should convert base64 file data to a Buffer before passing content to the chat SDK', async () => {
      const service = makeService();
      const result = await (service as any).prepareContentForDelivery(
        {
          markdown: 'Here is the file',
          files: [
            {
              filename: 'sample.txt',
              mimeType: 'text/plain',
              data: Buffer.from('hello').toString('base64'),
            },
          ],
        },
        'slack'
      );

      expect(Buffer.isBuffer(result.files[0].data)).to.equal(true);
      expect(result.files[0].data.toString()).to.equal('hello');
      expect(result.files[0].filename).to.equal('sample.txt');
      expect(result.files[0].mimeType).to.equal('text/plain');
    });

    it('should reject non-string file data with a meaningful error', async () => {
      const service = makeService();

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [
              {
                filename: 'sample.txt',
                data: { type: 'Buffer', data: [104, 101, 108, 108, 111] },
              },
            ],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('Invalid file "sample.txt": data must be a base64-encoded string.');
      }
    });

    it('should reject invalid base64 file data with a meaningful error', async () => {
      const service = makeService();

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [
              {
                filename: 'sample.txt',
                data: 'not base64',
              },
            ],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('Invalid file "sample.txt": data must be a base64-encoded string.');
      }
    });

    it('should reject inline file data over 5 MB', async () => {
      const service = makeService();

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [
              {
                filename: 'large.bin',
                data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64'),
              },
            ],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('inline data must be 5 MB or smaller');
      }
    });

    it('should fetch url file data to a Buffer and use response content-type as fallback mimeType', async () => {
      const service = makeService();
      sinon.stub(service as any, 'validateFileUrl').resolves(null);
      const requestStub = sinon.stub(service as any, 'requestPinnedFileUrl').resolves(
        makePinnedResponse({
          headers: {
            'content-type': 'text/plain',
            'content-length': '5',
          },
        })
      );

      const result = await (service as any).prepareContentForDelivery(
        {
          markdown: 'Here is the file',
          files: [
            {
              filename: 'sample.txt',
              url: 'https://example.com/sample.txt',
            },
          ],
        },
        'slack'
      );

      expect(requestStub.calledOnceWith('https://example.com/sample.txt')).to.equal(true);
      expect(Buffer.isBuffer(result.files[0].data)).to.equal(true);
      expect(result.files[0].data.toString()).to.equal('hello');
      expect(result.files[0].mimeType).to.equal('text/plain');
      expect(result.files[0].url).to.equal(undefined);
    });

    it('should validate redirected file urls before following them', async () => {
      const service = makeService();
      const validateStub = sinon
        .stub(service as any, 'validateFileUrl')
        .onFirstCall()
        .resolves(null)
        .onSecondCall()
        .resolves('Requests to "localhost" are not allowed.');
      const requestStub = sinon.stub(service as any, 'requestPinnedFileUrl').resolves(
        makePinnedResponse({
          status: 302,
          headers: {
            location: 'http://localhost/private.txt',
          },
        })
      );

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [{ filename: 'sample.txt', url: 'https://example.com/sample.txt' }],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect(validateStub.callCount).to.equal(2);
        expect(requestStub.calledOnceWith('https://example.com/sample.txt')).to.equal(true);
        expect((err as Error).message).to.include('Requests to "localhost" are not allowed.');
      }
    });

    it('should reject SSRF-blocked file urls', async () => {
      const service = makeService();
      sinon.stub(service as any, 'validateFileUrl').resolves('Requests to "localhost" are not allowed.');

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [{ filename: 'sample.txt', url: 'http://localhost/sample.txt' }],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('Requests to "localhost" are not allowed.');
      }
    });

    it('should reject non-2xx file url responses', async () => {
      const service = makeService();
      sinon.stub(service as any, 'validateFileUrl').resolves(null);
      sinon
        .stub(service as any, 'requestPinnedFileUrl')
        .resolves(makePinnedResponse({ status: 404, statusText: 'Not Found' }));

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [{ filename: 'missing.txt', url: 'https://example.com/missing.txt' }],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('404 Not Found');
      }
    });

    it('should reject file urls with content-length over the per-file limit', async () => {
      const service = makeService();
      sinon.stub(service as any, 'validateFileUrl').resolves(null);
      sinon.stub(service as any, 'requestPinnedFileUrl').resolves(
        makePinnedResponse({
          headers: {
            'content-length': String(26 * 1024 * 1024),
          },
        })
      );

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [{ filename: 'large.bin', url: 'https://example.com/large.bin' }],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('file size exceeds 25 MB');
      }
    });

    it('should reject streamed file url bodies over the per-file limit', async () => {
      const service = makeService();
      sinon.stub(service as any, 'validateFileUrl').resolves(null);
      sinon
        .stub(service as any, 'requestPinnedFileUrl')
        .rejects(new Error('Invalid file "large.bin": file size exceeds 25 MB.'));

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here is the file',
            files: [{ filename: 'large.bin', url: 'https://example.com/large.bin' }],
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('file size exceeds 25 MB');
      }
    });

    it('should reject more than 15 files per message', async () => {
      const service = makeService();

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here are the files',
            files: Array.from({ length: 16 }, (_, index) => ({
              filename: `${index}.txt`,
              data: Buffer.from('hello').toString('base64'),
            })),
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('maximum is 15 files per message');
      }
    });

    it('should reject aggregate attachment size over 50 MB', async () => {
      const service = makeService();
      sinon.stub(service as any, 'prepareFileForDelivery').callsFake(async (_file: unknown, index: number) => ({
        filename: `${index}.bin`,
        data: Buffer.from('hello'),
        size: 5 * 1024 * 1024,
        source: 'url',
      }));

      try {
        await (service as any).prepareContentForDelivery(
          {
            markdown: 'Here are the files',
            files: Array.from({ length: 11 }, (_, index) => ({
              filename: `${index}.bin`,
              url: `https://example.com/${index}.bin`,
            })),
          },
          'slack'
        );
        throw new Error('Expected prepareContentForDelivery to throw');
      } catch (err) {
        expect((err as Error).message).to.include('Total attachment size exceeds 50 MB');
      }
    });

    it('should drop files with a warning for email', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const service = new ChatSdkService(
        logger as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        { create: sinon.stub().resolves({ _id: 'm' }) } as any
      );

      const result = await (service as any).prepareContentForDelivery(
        {
          markdown: 'Here is the file',
          files: [{ filename: 'sample.txt', data: Buffer.from('hello').toString('base64') }],
        },
        'email',
        'agent-id'
      );

      expect(result.files).to.equal(undefined);
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[0]).to.deep.include({
        agentId: 'agent-id',
        platform: 'email',
        droppedCount: 1,
      });
    });

    it('should convert base64 file data to a Buffer for whatsapp', async () => {
      const service = makeService();
      const result = await (service as any).prepareContentForDelivery(
        {
          markdown: 'Here is the file',
          files: [
            {
              filename: 'sample.txt',
              mimeType: 'text/plain',
              data: Buffer.from('hello').toString('base64'),
            },
          ],
        },
        'whatsapp'
      );

      expect(Buffer.isBuffer(result.files[0].data)).to.equal(true);
      expect(result.files[0].data.toString()).to.equal('hello');
      expect(result.files[0].filename).to.equal('sample.txt');
      expect(result.files[0].mimeType).to.equal('text/plain');
    });
  });

  describe('buildSendEmailCallback', () => {
    it('should skip custom MIME alternatives for unsupported outbound providers', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const integrationRepository = {
        findOne: sinon.stub().resolves({
          _id: 'outbound-integration-id',
          _environmentId: 'env-id',
          _organizationId: 'org-id',
          providerId: EmailProviderIdEnum.Resend,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {},
          active: true,
        }),
      };
      const service = new ChatSdkService(
        logger as any,
        {} as any,
        {} as any,
        {} as any,
        integrationRepository as any,
        {} as any,
        {} as any,
        { create: sinon.stub().resolves({ _id: 'm' }) } as any
      );
      const sendEmail = (service as any).buildSendEmailCallback(
        {
          environmentId: 'env-id',
          organizationId: 'org-id',
          credentials: {},
        },
        'outbound-integration-id'
      );

      const result = await sendEmail({
        from: 'agent@example.com',
        to: 'user@gmail.com',
        subject: 'Re: Hello',
        text: '👀',
        html: '<p>👀</p>',
        alternatives: [
          {
            contentType: 'text/vnd.google.email-reaction+json',
            content: JSON.stringify({ version: 1, emoji: '👀' }),
          },
        ],
        messageId: '<reaction@example.com>',
        inReplyTo: '<original@example.com>',
        references: '<original@example.com>',
      });

      expect(result).to.deep.equal({ messageId: '<reaction@example.com>' });
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[0]).to.deep.equal({
        providerId: EmailProviderIdEnum.Resend,
        outboundIntegrationId: 'outbound-integration-id',
      });
      expect(logger.warn.firstCall.args[1]).to.include('does not support custom MIME alternatives');
      expect(
        integrationRepository.findOne.calledOnceWithMatch({
          _id: 'outbound-integration-id',
          channel: ChannelTypeEnum.EMAIL,
        })
      ).to.equal(true);
    });

    it('should not claim success when unsupported MIME alternatives omit messageId', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const integrationRepository = {
        findOne: sinon.stub().resolves({
          _id: 'outbound-integration-id',
          _environmentId: 'env-id',
          _organizationId: 'org-id',
          providerId: EmailProviderIdEnum.Resend,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {},
          active: true,
        }),
      };
      const service = new ChatSdkService(
        logger as any,
        {} as any,
        {} as any,
        {} as any,
        integrationRepository as any,
        {} as any,
        {} as any,
        { create: sinon.stub().resolves({ _id: 'm' }) } as any
      );
      const sendEmail = (service as any).buildSendEmailCallback(
        {
          environmentId: 'env-id',
          organizationId: 'org-id',
          credentials: {},
        },
        'outbound-integration-id'
      );

      const result = await sendEmail({
        from: 'agent@example.com',
        to: 'user@gmail.com',
        subject: 'Re: Hello',
        text: '👀',
        html: '<p>👀</p>',
        alternatives: [
          {
            contentType: 'text/vnd.google.email-reaction+json',
            content: JSON.stringify({ version: 1, emoji: '👀' }),
          },
        ],
      });

      expect(result).to.deep.equal({ messageId: undefined });
      expect(logger.warn.calledOnce).to.equal(true);
      expect(logger.warn.firstCall.args[0]).to.deep.equal({
        providerId: EmailProviderIdEnum.Resend,
        outboundIntegrationId: 'outbound-integration-id',
      });
      expect(logger.warn.firstCall.args[1]).to.include('no messageId was supplied');
    });
  });

  describe('sendViaNovuDemoProvider', () => {
    let novuEnterprise: string | undefined;
    let isSelfHosted: string | undefined;
    let sharedInboundDomain: string | undefined;
    let novuEmailApiKey: string | undefined;

    beforeEach(() => {
      novuEnterprise = process.env.NOVU_ENTERPRISE;
      isSelfHosted = process.env.IS_SELF_HOSTED;
      sharedInboundDomain = process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
      novuEmailApiKey = process.env.NOVU_EMAIL_INTEGRATION_API_KEY;

      process.env.NOVU_ENTERPRISE = 'true';
      delete process.env.IS_SELF_HOSTED;
      process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';
      process.env.NOVU_EMAIL_INTEGRATION_API_KEY = 'test-key';
    });

    afterEach(() => {
      if (novuEnterprise === undefined) delete process.env.NOVU_ENTERPRISE;
      else process.env.NOVU_ENTERPRISE = novuEnterprise;

      if (isSelfHosted === undefined) delete process.env.IS_SELF_HOSTED;
      else process.env.IS_SELF_HOSTED = isSelfHosted;

      if (sharedInboundDomain === undefined) delete process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
      else process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = sharedInboundDomain;

      if (novuEmailApiKey === undefined) delete process.env.NOVU_EMAIL_INTEGRATION_API_KEY;
      else process.env.NOVU_EMAIL_INTEGRATION_API_KEY = novuEmailApiKey;

      sinon.restore();
    });

    function makeSendViaService(deps: {
      calculateLimit?: { execute: sinon.SinonStub };
      messageCreate?: sinon.SinonStub;
    }) {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };

      const calculateLimitNovuIntegration = deps.calculateLimit ?? {
        execute: sinon.stub().resolves({ limit: 300, count: 0 }),
      };

      const messageRepository = {
        create: deps.messageCreate ?? sinon.stub().resolves({ _id: 'msg-1' }),
      };

      return new ChatSdkService(
        logger as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        calculateLimitNovuIntegration as any,
        messageRepository as any
      );
    }

    const demoConfig = {
      environmentId: 'env-id',
      organizationId: 'org-id',
      agentId: 'agent-1',
      credentials: {
        emailSlugPrefix: 'support',
        inboxRoutingKey: 'abcd1234',
        senderName: 'Support',
      },
    };

    const demoParams = {
      from: 'fallback@example.com',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      messageId: '<mid@example.com>',
    };

    const demoIntegration = {
      _id: 'novu-demo-id',
      _environmentId: 'env-id',
      _organizationId: 'org-id',
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      name: 'Novu Email',
      identifier: 'novu-email-demo',
      active: true,
      primary: true,
      credentials: {},
    };

    it('throws when Novu demo email credentials are not configured', async () => {
      delete process.env.NOVU_EMAIL_INTEGRATION_API_KEY;
      const messageCreate = sinon.stub().resolves({ _id: 'msg-1' });
      const service = makeSendViaService({ messageCreate });

      try {
        await (service as any).sendViaNovuDemoProvider(demoConfig, demoParams, demoIntegration);
        throw new Error('Expected sendViaNovuDemoProvider to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('not configured on this deployment');
        expect(messageCreate.called).to.equal(false);
      }
    });

    it('persists a Message with providerId Novu after successful send for quota accounting', async () => {
      const messageCreate = sinon.stub().resolves({ _id: 'msg-1' });
      const service = makeSendViaService({ messageCreate });
      const sendStub = sinon.stub().resolves({ id: 'sg-123' });
      sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub });

      const result = await (service as any).sendViaNovuDemoProvider(demoConfig, demoParams, demoIntegration);

      expect(result).to.deep.equal({ messageId: 'sg-123' });
      expect(sendStub.calledOnce).to.equal(true);
      expect(messageCreate.calledOnce).to.equal(true);
      expect(messageCreate.firstCall.args[0]).to.include({
        _environmentId: 'env-id',
        _organizationId: 'org-id',
        channel: ChannelTypeEnum.EMAIL,
        providerId: EmailProviderIdEnum.Novu,
        email: 'user@example.com',
        subject: 'Hello',
        transactionId: 'sg-123',
      });
      expect(messageCreate.firstCall.args[0].tags).to.deep.equal(['agent-demo-reply']);
    });

    it('throws when the Novu demo quota is exhausted', async () => {
      const calculateLimit = {
        execute: sinon.stub().resolves({ limit: 300, count: 300 }),
      };
      const messageCreate = sinon.stub().resolves({ _id: 'msg-1' });
      const service = makeSendViaService({ calculateLimit, messageCreate });

      try {
        await (service as any).sendViaNovuDemoProvider(demoConfig, demoParams, demoIntegration);
        throw new Error('Expected sendViaNovuDemoProvider to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('quota exhausted');
        expect(messageCreate.called).to.equal(false);
      }
    });
  });
});
