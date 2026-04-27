export enum DomainStatusEnum {
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export enum DomainRouteTypeEnum {
  AGENT = 'agent',
  WEBHOOK = 'webhook',
}

export type DomainRouteMatch = Record<string, unknown>;

export enum DomainRouteAuthStatusEnum {
  PASS = 'pass',
  FAIL = 'fail',
  SOFTFAIL = 'softfail',
  NEUTRAL = 'neutral',
  NONE = 'none',
}

export type RouteMatchContext = {
  mail: {
    fromAddress: string;
    fromDomain: string;
    fromName?: string;
    toAddress: string;
    toLocalPart: string;
    toDomain: string;
    subject: string;
    text: string;
    html: string;
    hasAttachments: boolean;
    attachmentCount: number;
    attachmentTotalBytes: number;
    inReplyTo?: string;
    headers: Record<string, string>;
  };
  domain: {
    name: string;
    data: Record<string, string>;
  };
  route: {
    address: string;
    data: Record<string, string>;
  };
  auth: {
    spf: DomainRouteAuthStatusEnum;
    dkim: DomainRouteAuthStatusEnum;
    dmarc: DomainRouteAuthStatusEnum;
    raw: string;
  };
};

export const ROUTE_MATCH_CONTEXT_PATHS = [
  'mail.fromAddress',
  'mail.fromDomain',
  'mail.fromName',
  'mail.toAddress',
  'mail.toLocalPart',
  'mail.toDomain',
  'mail.subject',
  'mail.text',
  'mail.html',
  'mail.hasAttachments',
  'mail.attachmentCount',
  'mail.attachmentTotalBytes',
  'mail.inReplyTo',
  'mail.headers.auto-submitted',
  'mail.headers.authentication-results',
  'domain.name',
  'route.address',
  'auth.spf',
  'auth.dkim',
  'auth.dmarc',
  'auth.raw',
] as const;

export type RouteMatchContextPath = (typeof ROUTE_MATCH_CONTEXT_PATHS)[number];

export enum DomainDiagnosticCodeEnum {
  MX_MISSING = 'mx_missing',
  MX_WRONG_TARGET = 'mx_wrong_target',
  MX_LOW_PRIORITY = 'mx_low_priority',
  APEX_CNAME_COLLISION = 'apex_cname_collision',
  DNSBL_LISTED = 'dnsbl_listed',
}

export enum DomainDiagnosticCheckStatusEnum {
  PASS = 'pass',
  FAIL = 'fail',
  SKIPPED = 'skipped',
}

export enum DomainDiagnosticSeverityEnum {
  WARN = 'warn',
  ERROR = 'error',
}
