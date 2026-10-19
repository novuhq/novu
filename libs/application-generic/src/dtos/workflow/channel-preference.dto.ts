import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChannelPreferenceDto {
  @ApiProperty({
    description:
      'A flag specifying if notification delivery is enabled for the channel. If true, notification delivery is enabled.',
    default: true,
  })
  @IsBoolean()
  enabled: boolean = true;
}
