import { RequestLog, Trace } from '@novu/application-generic';

export const traceSelectColumns = [
  'id',
  'created_at',
  'event_type',
  'title',
  'message',
  'raw_data',
  'status',
  'entity_type',
  'entity_id',
  'organization_id',
  'environment_id',
  'user_id',
  'external_subscriber_id',
  'subscriber_id',
] as const;
type GetTraceFetchResult = Pick<Trace, (typeof traceSelectColumns)[number]>;

export const requestLogSelectColumns = [
  'id',
  'created_at',
  'method',
  'path',
  'status_code',
  'transaction_id',
  'request_body',
  'response_body',
  'url',
  'url_pattern',
  'hostname',
  'ip',
  'user_agent',
  'auth_type',
  'duration_ms',
  'user_id',
  'organization_id',
  'environment_id',
  'transaction_id',
] as const;
type GetRequestLogFetchResult = Pick<RequestLog, (typeof requestLogSelectColumns)[number]>;
