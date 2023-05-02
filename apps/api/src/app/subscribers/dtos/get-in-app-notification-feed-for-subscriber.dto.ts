import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

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
  read: boolean;

  @ApiPropertyOptional({ required: false, type: Boolean })
  seen: boolean;
}
