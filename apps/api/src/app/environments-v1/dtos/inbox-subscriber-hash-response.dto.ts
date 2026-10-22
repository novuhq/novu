import { ApiProperty } from '@nestjs/swagger';

export class InboxSubscriberHashResponseDto {
  @ApiProperty({
    type: String,
    description: 'HMAC-SHA256 of the requested subscriberId, signed with the current environment API key.',
    example: 'a1b2c3d4e5f6',
  })
  subscriberHash: string;
}
