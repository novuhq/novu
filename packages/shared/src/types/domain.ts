export enum DomainStatusEnum {
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export enum DomainRouteTypeEnum {
  AGENT = 'agent',
  WEBHOOK = 'webhook',
}

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
