import { BadGatewayException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

const CLIENT_ADAPTER_ERROR_NAMES = new Set(['ValidationError']);
const CLIENT_ADAPTER_ERROR_CODES = new Set(['VALIDATION_ERROR']);

function getErrorResponseBody(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  return (err as { response?: { body?: unknown } }).response?.body;
}

function getDeliveryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as { errors?: Array<{ message?: unknown }>; message?: unknown };
  const firstErrorMessage = responseBody.errors?.[0]?.message;
  if (typeof firstErrorMessage === 'string') {
    return firstErrorMessage;
  }

  return typeof responseBody.message === 'string' ? responseBody.message : undefined;
}

function getUpstreamHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  const record = err as Record<string, unknown>;
  const response = record.response;
  const candidates = [record.status, record.statusCode];

  if (response && typeof response === 'object') {
    const responseRecord = response as Record<string, unknown>;
    candidates.push(responseRecord.status, responseRecord.statusCode);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && candidate >= 100 && candidate < 600) {
      return candidate;
    }
  }

  return undefined;
}

function isAdapterValidationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }

  const record = err as { name?: unknown; code?: unknown };

  if (typeof record.name === 'string' && CLIENT_ADAPTER_ERROR_NAMES.has(record.name)) {
    return true;
  }

  return typeof record.code === 'string' && CLIENT_ADAPTER_ERROR_CODES.has(record.code);
}

export function resolveDeliveryHttpStatus(err: unknown): number {
  const upstreamStatus = getUpstreamHttpStatus(err);

  if (upstreamStatus !== undefined) {
    if (upstreamStatus >= 400 && upstreamStatus < 500) {
      return upstreamStatus;
    }

    if (upstreamStatus >= 500) {
      return HttpStatus.BAD_GATEWAY;
    }
  }

  if (isAdapterValidationError(err)) {
    return HttpStatus.BAD_REQUEST;
  }

  return HttpStatus.BAD_GATEWAY;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }

  return String(err);
}

export function formatDeliveryErrorMessage(err: unknown): string {
  const base = getErrorMessage(err);
  const detail = getDeliveryErrorDetail(getErrorResponseBody(err));

  return detail ? `${base}: ${detail}` : base;
}

export function toDeliveryError(err: unknown): never {
  const status = resolveDeliveryHttpStatus(err);
  const payload = {
    error: 'delivery_failed',
    message: formatDeliveryErrorMessage(err),
  };

  if (status === HttpStatus.BAD_REQUEST) {
    throw new BadRequestException(payload);
  }

  if (status === HttpStatus.BAD_GATEWAY) {
    throw new BadGatewayException(payload);
  }

  throw new HttpException(payload, status);
}
