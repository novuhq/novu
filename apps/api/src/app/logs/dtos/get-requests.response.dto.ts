export type RequestLogResponseDto = {
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
  schemaType: string;
  durationMs: number;
};

export type GetRequestsResponseDto = {
  data: RequestLogResponseDto[];
  total: number;
  pageSize?: number;
  page?: number;
};
