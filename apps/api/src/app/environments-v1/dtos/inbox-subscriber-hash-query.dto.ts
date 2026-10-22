import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InboxSubscriberHashQueryDto {
  @ApiProperty({
    type: String,
    description:
      'Subscriber identity to sign. Must be the authenticated dashboard user id, or the dashboard web-chat tester id for that user.',
    example: '66f1c0e2a1b2c3d4e5f60789',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}
