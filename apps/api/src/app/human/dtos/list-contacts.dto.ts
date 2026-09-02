import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_CONTACTS_LIMIT = 50;
export const MAX_CONTACTS_LIMIT = 100;

export class ListContactsQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_CONTACTS_LIMIT, maximum: MAX_CONTACTS_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONTACTS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor from a previous page’s `next` — returns contacts after it.' })
  @IsOptional()
  @IsString()
  after?: string;
}

/**
 * A contact is a subscriber, viewed as "someone an agent can talk to".
 * Only the human-facing subset of the subscriber is exposed — internal ids,
 * legacy `channels`, and topic membership stay out of the contract.
 */
export class HumanContactDto {
  @ApiProperty()
  subscriberId: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Free-form custom data on the subscriber (e.g. role notes).',
    type: 'object',
    additionalProperties: true,
  })
  data?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ListContactsResponseDto {
  @ApiProperty({ type: [HumanContactDto] })
  data: HumanContactDto[];

  @ApiProperty({ nullable: true, description: 'Cursor for the next page, or null when this is the last page.' })
  next: string | null;
}
