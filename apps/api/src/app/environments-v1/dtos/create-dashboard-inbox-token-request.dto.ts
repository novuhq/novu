import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsTimeZone } from 'class-validator';

export class CreateDashboardInboxTokenRequestDto {
  @ApiPropertyOptional({
    type: String,
    description: "The browser's IANA timezone, saved on the dashboard user's subscriber when the token is exchanged.",
    example: 'Europe/Berlin',
  })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
