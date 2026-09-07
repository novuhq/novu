import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

function transformOptionalBoolean({ value }: { value: unknown }): boolean | undefined {
  if (typeof value === 'string') return value === 'true';
  if (typeof value === 'boolean') return value;

  return undefined;
}

export class GetInAppNotificationsFeedForSubscriberDto extends PaginationRequestDto(LIMIT.DEFAULT, LIMIT.MAX) {
  @ApiPropertyOptional({
    required: false,
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    ],
  })
  feedIdentifier: string | string[];

  @ApiPropertyOptional({ required: false, type: Boolean })
  @Transform(transformOptionalBoolean)
  read: boolean;

  @ApiPropertyOptional({ required: false, type: Boolean })
  @Transform(transformOptionalBoolean)
  seen: boolean;

  @ApiPropertyOptional({
    required: false,
    type: 'string',
    description: 'Base64 encoded string of the partial payload JSON object',
    example: 'btoa(JSON.stringify({ foo: 123 })) results in base64 encoded string like eyJmb28iOjEyM30=',
  })
  payload?: string;
}
