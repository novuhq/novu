import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IssueIntegrationMobileLinkRequestDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Optional subscriber to link via `/start` deep link after mobile setup completes. ' +
      'When provided, the consume response may include a ready-to-open Telegram deep link.',
    example: 'subscriber-123',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subscriberId?: string;
}
