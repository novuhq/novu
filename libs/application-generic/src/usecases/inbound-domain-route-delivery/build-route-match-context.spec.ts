import { DomainRouteAuthStatusEnum, DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { buildRouteMatchContext } from './build-route-match-context';
import type { InboundDomainRouteMailInput, RoutableDomain } from './inbound-domain-route-delivery.usecase';

const domain: RoutableDomain = {
  _id: 'domain-001',
  name: 'example.com',
  status: DomainStatusEnum.VERIFIED,
  mxRecordConfigured: true,
  _environmentId: 'env-001',
  _organizationId: 'org-001',
  data: { tenant: 'acme' },
};

const route = {
  _id: 'route-001',
  _domainId: 'domain-001',
  address: 'support',
  type: DomainRouteTypeEnum.WEBHOOK,
  data: { queue: 'tier-1' },
  _environmentId: 'env-001',
  _organizationId: 'org-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeMail(overrides: Partial<InboundDomainRouteMailInput> = {}): InboundDomainRouteMailInput {
  return {
    from: [{ address: 'Sender@Acme.com', name: 'Sender' }],
    to: [{ address: 'Support@Example.com', name: '' }],
    subject: 'Hello',
    html: '<p>Hello</p>',
    text: 'Hello',
    headers: {
      'content-type': 'text/plain',
      from: 'Sender@Acme.com',
      to: 'Support@Example.com',
      subject: 'Hello',
      'message-id': 'msg-001',
      date: new Date().toUTCString(),
      'mime-version': '1.0',
      'authentication-results': 'mx.example; spf=pass smtp.mailfrom=acme.com; dkim=fail; dmarc=neutral',
    } as InboundDomainRouteMailInput['headers'],
    attachments: [{ size: 10 }, { content: 'hello' }],
    messageId: 'msg-001',
    inReplyTo: 'reply-001',
    date: new Date(),
    cc: [],
    ...overrides,
  };
}

describe('buildRouteMatchContext', () => {
  it('normalizes addresses, metadata, attachments, and auth results', () => {
    const context = buildRouteMatchContext(domain, route, makeMail());

    expect(context.mail.fromAddress).to.equal('sender@acme.com');
    expect(context.mail.fromDomain).to.equal('acme.com');
    expect(context.mail.toLocalPart).to.equal('support');
    expect(context.domain.data).to.deep.equal({ tenant: 'acme' });
    expect(context.route.data).to.deep.equal({ queue: 'tier-1' });
    expect(context.mail.hasAttachments).to.equal(true);
    expect(context.mail.attachmentCount).to.equal(2);
    expect(context.mail.attachmentTotalBytes).to.equal(15);
    expect(context.auth.spf).to.equal(DomainRouteAuthStatusEnum.PASS);
    expect(context.auth.dkim).to.equal(DomainRouteAuthStatusEnum.FAIL);
    expect(context.auth.dmarc).to.equal(DomainRouteAuthStatusEnum.NEUTRAL);
  });

  it('falls back to none when authentication headers are missing or malformed', () => {
    const context = buildRouteMatchContext(
      domain,
      route,
      makeMail({
        headers: {
          'content-type': 'text/plain',
          from: 'sender@acme.com',
          to: 'support@example.com',
          subject: 'Hello',
          'message-id': 'msg-001',
          date: new Date().toUTCString(),
          'mime-version': '1.0',
        },
        attachments: [],
      })
    );

    expect(context.auth.spf).to.equal(DomainRouteAuthStatusEnum.NONE);
    expect(context.auth.dkim).to.equal(DomainRouteAuthStatusEnum.NONE);
    expect(context.auth.dmarc).to.equal(DomainRouteAuthStatusEnum.NONE);
    expect(context.mail.hasAttachments).to.equal(false);
    expect(context.mail.attachmentTotalBytes).to.equal(0);
  });
});
