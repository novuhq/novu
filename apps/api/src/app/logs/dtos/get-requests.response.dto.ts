export class RequestLog {
  id: string;
  createdAt: string;
  url: string;
  method: string;
  statusCode: number;
  path: string;
  hostname: string;
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
}

export class GetRequestsResponseDto {
  data: RequestLog[];
  total: number;
  pageSize?: number;
  page?: number;
}
