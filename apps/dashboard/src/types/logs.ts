export type RequestLog = {
  id: string;
  createdAt: string;
  url: string;
  urlPattern: string;
  method: string;
  statusCode: number;
  path: string;
  hostname: string;
  transactionId: string | null;
  ip: string;
  userAgent: string;
  requestBody: string;
  responseBody: string;
  userId: string;
  organizationId: string;
  environmentId: string;
  authType: string;
  durationMs: number;
};

export type ApiTrace = {
  id: string;
  createdAt: string;
  eventType: string;
  title: string;
  message?: string | null;
  rawData?: string | null;
  status: 'success' | 'error' | 'warning' | 'pending';
  entityType: string;
  entityId: string;
  organizationId: string;
  environmentId: string;
  userId?: string | null;
  externalSubscriberId?: string | null;
  subscriberId?: string | null;
};

export type RequestTraces = {
  request: RequestLog;
  traces: ApiTrace[];
};

export type LogsFilters = {
  statusCode?: number[];
  method?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  search?: string;
};

export type LogsSortOrder = 'asc' | 'desc';
