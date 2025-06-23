export type HttpLog = {
  timestamp: string; // ISO date string
  path: string;
  url: string;
  hostname: string;
  statusCode: number;
  method: string;
  transactionId: string | null;
  ip: string;
  userAgent: string;
  queryParams: string;
  requestBody: string;
  responseBody: string;
  userId: string;
  organizationId: string;
  environmentId: string;
  schemaType: string;
  durationMs: number;
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
