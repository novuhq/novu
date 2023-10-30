import { BadRequestException } from '@nestjs/common';

export class PlatformException extends Error {}

export class ApiException extends BadRequestException {}

export const EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER =
  'Exception while performing webhook request.';
