import { z } from 'zod';

// Corresponds to the ClickHouse http_logs table schema
export const httpLogSchema = z.object({
  timestamp: z.date().or(z.string()).describe('DateTime'),
  path: z.string().describe('String'),
  url: z.string().describe('String'),
  hostname: z.string().describe('String'),
  status_code: z.number().describe('UInt16'),
  method: z.string().describe('LowCardinality(String)'),
  transaction_id: z.string().nullable().describe('Nullable(String)'),
  ip: z.string().describe('String'),
  user_agent: z.string().describe('String'),
  query_params: z.string().describe('String'),
  request_body: z.string().describe('String'),
  response_body: z.string().describe('String'),
  user_id: z.string().describe('String'),
  organization_id: z.string().describe('String'),
  environment_id: z.string().describe('String'),
  schema_type: z.string().describe('String'),
  duration_ms: z.number().describe('UInt32'),
});

export type HttpLog = z.infer<typeof httpLogSchema>;
