export class HttpLog {
  id: string;
  timestamp: string;
  url: string;
  method: string;
  statusCode: number;
}

export class GetHttpLogsResponseDto {
  data: HttpLog[];
  total: number;
  pageSize?: number;
  page?: number;
}
