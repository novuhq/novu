import { RequestLog } from '@novu/application-generic';
import { RequestLogResponseDto } from '../dtos/get-requests.response.dto';

export function mapRequestLogToResponseDto(log: RequestLog): RequestLogResponseDto {
  return {
    id: log.id,
    createdAt: new Date(`${log.created_at} UTC`).toISOString(),
    url: log.url,
    urlPattern: log.url_pattern,
    method: log.method,
    path: log.path,
    statusCode: log.status_code,
    hostname: log.hostname,
    transactionId: log.transaction_id,
    ip: log.ip,
    userAgent: log.user_agent,
    requestBody: log.request_body,
    responseBody: log.response_body,
    userId: log.user_id,
    organizationId: log.organization_id,
    environmentId: log.environment_id,
    authType: log.auth_type,
    durationMs: log.duration_ms,
  };
}
