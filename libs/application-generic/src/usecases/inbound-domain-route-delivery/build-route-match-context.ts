import { DomainRouteAuthStatusEnum, RouteMatchContext } from '@novu/shared';
import type { DomainRouteEntity } from '@novu/dal';
import type { InboundDomainRouteMailInput, RoutableDomain } from './inbound-domain-route-delivery.usecase';

type AttachmentLike = {
  size?: unknown;
  contentLength?: unknown;
  content?: unknown;
};

function splitEmailAddress(address: string): { localPart: string; domain: string } {
  const [localPart = '', domain = ''] = address.toLowerCase().split('@');

  return { localPart, domain };
}

function normalizeHeaders(headers: InboundDomainRouteMailInput['headers']): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value ?? '')])
  );
}

function parseAuthStatus(raw: string, key: 'spf' | 'dkim' | 'dmarc'): DomainRouteAuthStatusEnum {
  const match = raw.toLowerCase().match(new RegExp(`${key}=([a-z]+)`));
  const value = match?.[1];

  if (value && Object.values(DomainRouteAuthStatusEnum).includes(value as DomainRouteAuthStatusEnum)) {
    return value as DomainRouteAuthStatusEnum;
  }

  return DomainRouteAuthStatusEnum.NONE;
}

function getAttachmentSize(attachment: unknown): number {
  const value = attachment as AttachmentLike;

  if (typeof value?.size === 'number') return value.size;
  if (typeof value?.contentLength === 'number') return value.contentLength;
  if (typeof value?.content === 'string') return Buffer.byteLength(value.content);
  if (Buffer.isBuffer(value?.content)) return value.content.byteLength;

  return 0;
}

export function buildRouteMatchContext(
  domain: RoutableDomain,
  route: DomainRouteEntity,
  mail: InboundDomainRouteMailInput
): RouteMatchContext {
  const from = mail.from[0] ?? { address: '', name: '' };
  const to = mail.to[0] ?? { address: `${route.address}@${domain.name}`, name: '' };
  const headers = normalizeHeaders(mail.headers);
  const rawAuthHeader = headers['authentication-results'] ?? '';
  const fromParts = splitEmailAddress(from.address);
  const toParts = splitEmailAddress(to.address);
  const attachments = mail.attachments ?? [];

  return {
    mail: {
      fromAddress: from.address.toLowerCase(),
      fromDomain: fromParts.domain,
      fromName: from.name || undefined,
      toAddress: to.address.toLowerCase(),
      toLocalPart: toParts.localPart,
      toDomain: toParts.domain,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
      attachmentTotalBytes: attachments.reduce<number>((total, attachment) => total + getAttachmentSize(attachment), 0),
      inReplyTo: mail.inReplyTo,
      headers,
    },
    domain: {
      name: domain.name,
      data: domain.data ?? {},
    },
    route: {
      address: route.address,
      data: route.data ?? {},
    },
    auth: {
      spf: parseAuthStatus(rawAuthHeader, 'spf'),
      dkim: parseAuthStatus(rawAuthHeader, 'dkim'),
      dmarc: parseAuthStatus(rawAuthHeader, 'dmarc'),
      raw: rawAuthHeader,
    },
  };
}
