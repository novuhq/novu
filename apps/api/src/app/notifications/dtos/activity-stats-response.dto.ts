import { ApiProperty } from '@nestjs/swagger';

export class ActivityStatsResponseDto {
  @ApiProperty()
  weeklySent: number;

  @ApiProperty()
  monthlySent: number;
}
