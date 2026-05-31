import { Test, TestingModule } from '@nestjs/testing';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { PinoLogger } from '../../logging';
import { HttpClientService } from '../../services/http-client/http-client.service';
import { SendWebhookMessage } from '../../webhooks/usecases/send-webhook-message/send-webhook-message.usecase';
import { AttachmentRehydrator } from './attachment-rehydrator';
import { InboundDomainRouteDelivery, InboundDomainRouteMailInput } from './inbound-domain-route-delivery.usecase';

describe('InboundDomainRouteDelivery.previewAgentMailPayload', () => {
  let usecase: InboundDomainRouteDelivery;
  let sandbox: sinon.SinonSandbox;

  const baseMail: InboundDomainRouteMailInput = {
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'agent@inbox.example.com', name: '' }],
    subject: 'Hello',
    html: '<p>Hi</p>',
    text: 'Hi',
    headers: {} as InboundDomainRouteMailInput['headers'],
    attachments: undefined,
    messageId: 'msg-001@example.com',
    inReplyTo: undefined,
    references: undefined,
    date: new Date('2024-01-01T00:00:00.000Z'),
    cc: [],
  };

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundDomainRouteDelivery,
        { provide: SendWebhookMessage, useValue: sandbox.createStubInstance(SendWebhookMessage) },
        { provide: HttpClientService, useValue: sandbox.createStubInstance(HttpClientService) },
        { provide: IntegrationRepository, useValue: sandbox.createStubInstance(IntegrationRepository) },
        { provide: AgentIntegrationRepository, useValue: sandbox.createStubInstance(AgentIntegrationRepository) },
        { provide: AttachmentRehydrator, useValue: sandbox.createStubInstance(AttachmentRehydrator) },
        { provide: PinoLogger, useValue: { info: () => {}, warn: () => {}, error: () => {}, setContext: () => {} } },
      ],
    }).compile();

    usecase = module.get<InboundDomainRouteDelivery>(InboundDomainRouteDelivery);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('emits url + size for S3-mode attachments', () => {
    const mail: InboundDomainRouteMailInput = {
      ...baseMail,
      attachments: [
        {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
          size: 1024,
          url: 'https://s3.example.com/inbound-mail/msg-001/0-doc.pdf?sig=xyz',
          storagePath: 'inbound-mail/msg-001/0-doc.pdf',
        },
      ],
    };

    const payload = usecase.previewAgentMailPayload(mail);

    expect(payload.attachments).to.have.length(1);
    const att = payload.attachments![0];
    expect(att.filename).to.equal('doc.pdf');
    expect(att.contentType).to.equal('application/pdf');
    expect(att.size).to.equal(1024);
    expect(att.url).to.equal('https://s3.example.com/inbound-mail/msg-001/0-doc.pdf?sig=xyz');
    expect(att).to.not.have.property('contentBase64');
  });

  it('emits contentBase64 for inline-mode attachments (S3 not configured)', () => {
    const mail: InboundDomainRouteMailInput = {
      ...baseMail,
      attachments: [
        {
          filename: 'inline.txt',
          contentType: 'text/plain',
          size: 5,
          content: { type: 'Buffer', data: [104, 101, 108, 108, 111] },
        },
      ],
    };

    const payload = usecase.previewAgentMailPayload(mail);

    expect(payload.attachments).to.have.length(1);
    const att = payload.attachments![0];
    expect(att.filename).to.equal('inline.txt');
    expect(att.contentType).to.equal('text/plain');
    expect(att.size).to.equal(5);
    expect(att.contentBase64).to.equal(Buffer.from('hello').toString('base64'));
    expect(att.url).to.be.undefined;
  });

  it('skips contentBase64 for oversized inline attachments (defensive size guard)', () => {
    const oversized = 5 * 1024 * 1024 + 1;
    const mail: InboundDomainRouteMailInput = {
      ...baseMail,
      attachments: [
        {
          filename: 'huge.bin',
          contentType: 'application/octet-stream',
          size: oversized,
          content: { type: 'Buffer', data: new Array(oversized).fill(0) },
        },
      ],
    };

    const payload = usecase.previewAgentMailPayload(mail);

    expect(payload.attachments).to.have.length(1);
    const att = payload.attachments![0];
    expect(att.filename).to.equal('huge.bin');
    expect(att.size).to.equal(oversized);
    expect(att.contentBase64).to.be.undefined;
    expect(att.url).to.be.undefined;
  });

  it('returns undefined attachments when none present', () => {
    const payload = usecase.previewAgentMailPayload({ ...baseMail, attachments: undefined });

    expect(payload.attachments).to.be.undefined;
  });

  it('includes core mail metadata regardless of attachment shape', () => {
    const payload = usecase.previewAgentMailPayload({
      ...baseMail,
      inReplyTo: 'previous@example.com',
      references: ['ref-1@example.com', 'ref-2@example.com'],
    });

    expect(payload.messageId).to.equal('msg-001@example.com');
    expect(payload.subject).to.equal('Hello');
    expect(payload.from).to.deep.equal({ address: 'sender@example.com', name: 'Sender' });
    expect(payload.to).to.deep.equal([{ address: 'agent@inbox.example.com', name: '' }]);
    expect(payload.inReplyTo).to.equal('previous@example.com');
    expect(payload.references).to.equal('ref-1@example.com ref-2@example.com');
    expect(payload.date).to.equal(new Date('2024-01-01T00:00:00.000Z').toISOString());
  });
});
