import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SUBSCRIBER_SESSION_STATS_RETENTION_DAYS } from '../../shared/services/subscriber-session-auth-stats.service';

export class SubscriberSessionStatsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'How many UTC days to count, 1 to 35',
    default: 30,
    minimum: 1,
    maximum: SUBSCRIBER_SESSION_STATS_RETENTION_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SUBSCRIBER_SESSION_STATS_RETENTION_DAYS)
  days: number = 30;
}

export class SubscriberSessionClientStatsDto {
  @ApiProperty({ type: String, description: 'SDK client such as @novu/js@3.14.0, or unknown, legacy-widget, other' })
  client: string;

  @ApiProperty({ type: Number, description: 'Inbox logins with a signed subscriber token' })
  token: number;

  @ApiProperty({ type: Number, description: 'Inbox logins with a subscriber hash or with no hash' })
  withoutToken: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'UTC days since the last login without a token: 0 is today, null is never in the window',
  })
  lastSeenWithoutTokenDaysAgo: number | null;
}

export class SubscriberSessionStatsResponseDto {
  @ApiProperty({ type: Number })
  days: number;

  @ApiProperty({ type: Boolean, description: 'False when the counts cannot be read; clients is then empty, not real.' })
  available: boolean;

  @ApiProperty({ type: SubscriberSessionClientStatsDto, isArray: true })
  clients: SubscriberSessionClientStatsDto[];
}
