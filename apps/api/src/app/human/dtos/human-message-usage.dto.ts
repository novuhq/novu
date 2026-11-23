import { ApiProperty } from '@nestjs/swagger';

/** One window of the message limit: a UTC day or a UTC month. */
export class HumanMessageWindowUsageDto {
  @ApiProperty({ description: 'The messages the account’s agents sent to people in this window.' })
  used: number;

  @ApiProperty({ description: 'How many the account may send in it.' })
  limit: number;

  @ApiProperty({ description: 'When the window starts over, e.g. `2026-11-21T00:00:00.000Z`.' })
  resetsAt: string;
}

/** How much of the message limit the account has used. Both windows are `null` where nothing is counted. */
export class HumanMessageUsageResponseDto {
  @ApiProperty({ type: HumanMessageWindowUsageDto, nullable: true, description: 'Today, a UTC day.' })
  daily: HumanMessageWindowUsageDto | null;

  @ApiProperty({ type: HumanMessageWindowUsageDto, nullable: true, description: 'This month, a UTC month.' })
  monthly: HumanMessageWindowUsageDto | null;
}
