import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendPhotonTestMessageRequestDto {
  @ApiProperty({
    type: String,
    description:
      'Novu subscriber ID whose phone field receives the Photon iMessage test message. The dashboard patches subscriber.phone before calling this endpoint.',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

export class SendPhotonTestMessageErrorDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: ['missing_credentials', 'invalid_recipient', 'recipient_not_opted_in', 'photon_rejected', 'unknown'],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to surface in the dashboard' })
  message: string;
}

export class SendPhotonTestMessageResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Photon accepted the send request' })
  success: boolean;

  @ApiPropertyOptional({ type: String, description: 'Photon-assigned message identifier for the queued send' })
  messageId?: string;

  @ApiPropertyOptional({ type: SendPhotonTestMessageErrorDto, description: 'Populated when success is false' })
  error?: SendPhotonTestMessageErrorDto;
}
