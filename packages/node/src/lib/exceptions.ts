/* eslint-disable @typescript-eslint/naming-convention */

export interface HttpException extends Error {
  readonly status: number;
}

export class ServerException implements HttpException {
  readonly name: string = 'ServerException';
  readonly message: string = 'The request could not be completed.';

  constructor(readonly status: number, message: string | undefined) {
    this.status = status;
    if (message) {
      this.message = message;
    }
  }
}

export class UnauthorizedException implements HttpException {
  readonly status: number = 401;
  readonly name: string = 'UnauthorizedException';
  readonly message: string;

  constructor(message: string | undefined) {
    if (message) {
      this.message = message;
    }
  }
}

export class NotFoundException implements HttpException {
  readonly status: number = 404;
  readonly name: string = 'NotFoundException';
  readonly message: string;

  constructor(message: string | undefined) {
    if (message) {
      this.message = message;
    }
  }
}

export class UnprocessableEntityException implements HttpException {
  readonly status: number = 422;
  readonly name: string = 'UnprocessableEntityException';
  readonly message: string;

  constructor(message: string | undefined) {
    if (message) {
      this.message = message;
    }
  }
}

export class BadRequestException implements HttpException {
  readonly status: number = 400;
  readonly name: string = 'BadRequestException';
  readonly message: string;

  constructor(message: string) {
    this.message = `Error occurred: ${message}`;
  }
}
