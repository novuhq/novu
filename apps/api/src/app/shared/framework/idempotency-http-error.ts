import { HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';

export type CachedHttpError = {
  statusCode: number;
  response: string | object;
};

export function serializeCachedHttpError(err: unknown): CachedHttpError {
  if (err instanceof HttpException && err.getStatus() < HttpStatus.INTERNAL_SERVER_ERROR) {
    return {
      statusCode: err.getStatus(),
      response: err.getResponse(),
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    response: new InternalServerErrorException().getResponse(),
  };
}

export function restoreCachedHttpException(data: unknown): HttpException {
  if (!isRecord(data)) {
    return new InternalServerErrorException();
  }

  const response = data.response;
  let statusCode: number | undefined;
  if (typeof data.statusCode === 'number') {
    statusCode = data.statusCode;
  } else if (typeof data.status === 'number') {
    statusCode = data.status;
  }

  if (
    statusCode != null &&
    statusCode >= 400 &&
    statusCode < HttpStatus.INTERNAL_SERVER_ERROR &&
    (typeof response === 'string' || isRecord(response) || Array.isArray(response))
  ) {
    return new HttpException(response, statusCode);
  }

  return new InternalServerErrorException();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
