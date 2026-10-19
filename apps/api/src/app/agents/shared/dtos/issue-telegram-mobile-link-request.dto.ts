import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class IssueTelegramMobileLinkRequestDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Subscriber id to bind when the mobile setup completes. When set, the consume response includes a ' +
      '`t.me/<bot>?start=<code>` deep link for that subscriber.',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;
}
