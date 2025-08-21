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

export const requestLogSelectColumns = [
  'id',
  'created_at',
  'method',
  'path',
  'status_code',
  'transaction_id',
  'request_body',
  'response_body',
] as const;
