import { Test, TestingModule } from '@nestjs/testing';
import { AgentIntegrationRepository, DomainRouteEntity, IntegrationRepository } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { PinoLogger } from '../../logging';
import { FeatureFlagsService } from '../../services/feature-flags';
import { HttpClientService } from '../../services/http-client/http-client.service';
import { SendWebhookMessage } from '../../webhooks/usecases/send-webhook-message/send-webhook-message.usecase';
import { AttachmentRehydrator } from './attachment-rehydrator';
import { InboundDomainRouteDelivery, InboundDomainRouteMailInput } from './inbound-domain-route-delivery.usecase';

describe('InboundDomainRouteDelivery.previewAgentMailPayload', () => {
  let usecase: InboundDomainRouteDelivery;
  let sandbox: sinon.SinonSandbox;
  let attachmentRehydrator: sinon.SinonStubbedInstance<AttachmentRehydrator>;
  let featureFlagsService: { getFlag: sinon.SinonStub };
  let sendWebhookMessage: sinon.SinonStubbedInstance<SendWebhookMessage>;

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
    attachmentRehydrator = sandbox.createStubInstance(AttachmentRehydrator);
    featureFlagsService = { getFlag: sandbox.stub().resolves(false) };
    sendWebhookMessage = sandbox.createStubInstance(SendWebhookMessage);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundDomainRouteDelivery,
        { provide: SendWebhookMessage, useValue: sendWebhookMessage },
        { provide: HttpClientService, useValue: sandbox.createStubInstance(HttpClientService) },
        { provide: IntegrationRepository, useValue: sandbox.createStubInstance(IntegrationRepository) },
        { provide: AgentIntegrationRepository, useValue: sandbox.createStubInstance(AgentIntegrationRepository) },
        { provide: AttachmentRehydrator, useValue: attachmentRehydrator },
        { provide: FeatureFlagsService, useValue: featureFlagsService },
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

  it('uses signed attachment URLs when enabled for the organization', async () => {
    featureFlagsService.getFlag.resolves(true);
    attachmentRehydrator.createSignedUrls.resolves([]);
    sendWebhookMessage.execute.resolves({ eventId: 'event-1' });

    await usecase.deliverToWebhook({
      environmentId: 'env-1',
      organizationId: 'org-1',
      domain: {
        _id: 'domain-1',
        name: 'inbox.example.com',
        status: DomainStatusEnum.VERIFIED,
        mxRecordConfigured: true,
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        data: {},
      },
      route: {
        _id: 'route-1',
        _domainId: 'domain-1',
        address: 'support',
        type: DomainRouteTypeEnum.WEBHOOK,
        data: {},
        _environmentId: 'env-1',
        _organizationId: 'org-1',
      } as DomainRouteEntity,
      mail: baseMail,
    });

    sinon.assert.calledOnceWithExactly(attachmentRehydrator.createSignedUrls, baseMail.attachments);
    sinon.assert.notCalled(attachmentRehydrator.rehydrate);
  });

  it('keeps legacy attachment content when the flag is disabled', async () => {
    attachmentRehydrator.rehydrate.resolves([]);
    sendWebhookMessage.execute.resolves({ eventId: 'event-1' });

    await usecase.deliverToWebhook({
      environmentId: 'env-1',
      organizationId: 'org-1',
      domain: {
        _id: 'domain-1',
        name: 'inbox.example.com',
        status: DomainStatusEnum.VERIFIED,
        mxRecordConfigured: true,
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        data: {},
      },
      route: {
        _id: 'route-1',
        _domainId: 'domain-1',
        address: 'support',
        type: DomainRouteTypeEnum.WEBHOOK,
        data: {},
        _environmentId: 'env-1',
        _organizationId: 'org-1',
      } as DomainRouteEntity,
      mail: baseMail,
    });

    sinon.assert.calledOnceWithExactly(attachmentRehydrator.rehydrate, baseMail.attachments);
    sinon.assert.notCalled(attachmentRehydrator.createSignedUrls);
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

  it('forwards the DKIM/SPF verdicts so the agent can reject spoofed senders', () => {
    const payload = usecase.previewAgentMailPayload({ ...baseMail, dkim: 'pass', spf: 'failed' });

    expect(payload.dkim).to.equal('pass');
    expect(payload.spf).to.equal('failed');
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

  it('includes normalized headers with a size cap', () => {
    const payload = usecase.previewAgentMailPayload({
      ...baseMail,
      headers: {
        from: 'sender@example.com',
        to: 'agent@inbox.example.com',
        subject: 'Hello',
        'message-id': 'msg-001@example.com',
        'content-type': 'text/plain',
        date: 'Mon, 01 Jan 2024 00:00:00 +0000',
        'mime-version': '1.0',
      } as InboundDomainRouteMailInput['headers'],
    });

    expect(payload.headers).to.deep.equal({
      from: 'sender@example.com',
      to: 'agent@inbox.example.com',
      subject: 'Hello',
      'message-id': 'msg-001@example.com',
      'content-type': 'text/plain',
      date: 'Mon, 01 Jan 2024 00:00:00 +0000',
      'mime-version': '1.0',
    });
  });

  it('includes resolved domain and route metadata when provided', () => {
    const payload = usecase.previewAgentMailPayload(baseMail, {
      domain: {
        _id: 'domain-1',
        name: 'inbox.example.com',
        status: DomainStatusEnum.VERIFIED,
        mxRecordConfigured: true,
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        data: { tier: 'pro' },
      },
      route: {
        _id: 'route-1',
        _domainId: 'domain-1',
        address: 'support',
        destination: 'agent-1',
        type: DomainRouteTypeEnum.AGENT,
        data: { queue: 'tier-1' },
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      } as DomainRouteEntity,
    });

    expect(payload.domain).to.deep.equal({
      id: 'domain-1',
      name: 'inbox.example.com',
      data: { tier: 'pro' },
    });
    expect(payload.route).to.deep.equal({
      address: 'support',
      data: { queue: 'tier-1' },
    });
  });
});
