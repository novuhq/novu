import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IssueTelegramSubscriberLinkRequestDto {
  @ApiProperty({
    type: String,
    description:
      'External subscriber identifier to link to the Telegram chat that runs `/start <token>` on this deep link.',
    example: 'subscriber-123',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}
