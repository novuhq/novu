export type AnalyticsHttpLog = {
  timestamp: Date;
  path: string;
  url: string;
  hostname: string;
  status_code: number;
  method: string;
  transaction_id?: string;
  ip?: string;
  user_agent: string;
  query_params: string;
  request_body: string;
  response_body: string;
  user_id: string;
  organization_id: string;
  environment_id: string;
  schema_type: string;
  duration_ms: number;
};

export enum AnalyticsTablesEnum {
  HTTP_LOGS = 'http_logs',
}
