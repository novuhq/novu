import { BadRequestException } from '@nestjs/common';

export class PlatformException extends Error {}

export class ApiException extends BadRequestException {}
